"""Tests for twitter_client.py

Run with: pytest test_twitter.py -v
"""

from __future__ import annotations

import asyncio
from unittest.mock import AsyncMock, patch

import pytest

import twitter_client as tc


# ─── _check_tweet_length ─────────────────────────────

class TestTweetLengthCheck:
    def test_tweet_length_check_valid_short(self):
        assert tc._check_tweet_length("Hello world") is True

    def test_tweet_length_check_exactly_280(self):
        text = "x" * 280
        assert tc._check_tweet_length(text) is True

    def test_tweet_length_check_empty(self):
        assert tc._check_tweet_length("") is True

    def test_tweet_length_check_over_limit(self):
        text = "x" * 281
        assert tc._check_tweet_length(text) is False

    def test_tweet_length_check_far_over_limit(self):
        text = "x" * 600
        assert tc._check_tweet_length(text) is False


# ─── split_into_thread ────────────────────────────────

class TestThreadSplitting:
    def test_short_text_returns_single_tweet(self):
        text = "This is a short tweet."
        result = tc.split_into_thread(text)
        assert result == [text]

    def test_600_char_text_splits_into_multiple(self):
        # Build a 600-char text with clear sentence boundaries
        sentence = "This is a sentence that is long enough to test splitting. "
        text = sentence * 11  # ~638 chars
        result = tc.split_into_thread(text)
        assert len(result) >= 2

    def test_each_tweet_within_limit(self):
        sentence = "This is a sentence that needs to be split across multiple tweets because it is long. "
        text = sentence * 8  # ~680 chars
        result = tc.split_into_thread(text)
        for tweet in result:
            assert len(tweet) <= 280, f"Tweet too long ({len(tweet)}): {tweet!r}"

    def test_paragraph_split(self):
        para1 = "First paragraph with some content here."
        para2 = "Second paragraph with different content."
        # Create a text where combined is > 280 but each paragraph < 280
        long_para1 = para1 + " " + "Extra filler text to make this longer. " * 5  # ~240 chars
        long_para2 = para2 + " " + "More filler to push over limit. " * 5  # ~200 chars
        text = long_para1 + "\n\n" + long_para2
        result = tc.split_into_thread(text)
        for tweet in result:
            assert len(tweet) <= 280

    def test_exactly_280_returns_single(self):
        text = "x" * 280
        result = tc.split_into_thread(text)
        assert result == [text]

    def test_281_chars_splits(self):
        text = ("word " * 57).strip()  # ~285 chars
        result = tc.split_into_thread(text)
        assert len(result) >= 2
        for tweet in result:
            assert len(tweet) <= 280


# ─── post_tweet ───────────────────────────────────────

class TestPostTweetCallsApi:
    @pytest.mark.asyncio
    async def test_post_tweet_calls_api(self):
        mock_response = {"data": {"id": "123456", "text": "Hello Twitter!"}}
        with patch.object(tc, "_twitter_request", new=AsyncMock(return_value=mock_response)) as mock_req:
            result = await tc.post_tweet("Hello Twitter!")
        mock_req.assert_called_once_with(
            "POST",
            "/tweets",
            json_body={"text": "Hello Twitter!"},
        )
        assert result == mock_response

    @pytest.mark.asyncio
    async def test_post_tweet_with_reply_to(self):
        mock_response = {"data": {"id": "789", "text": "Reply!"}}
        with patch.object(tc, "_twitter_request", new=AsyncMock(return_value=mock_response)) as mock_req:
            result = await tc.post_tweet("Reply!", reply_to="111")
        mock_req.assert_called_once_with(
            "POST",
            "/tweets",
            json_body={"text": "Reply!", "reply": {"in_reply_to_tweet_id": "111"}},
        )
        assert result == mock_response


# ─── post_tweet validates length ─────────────────────

class TestPostTweetValidatesLength:
    @pytest.mark.asyncio
    async def test_post_tweet_validates_length_raises(self):
        long_text = "x" * 281
        with pytest.raises(ValueError, match="280"):
            await tc.post_tweet(long_text)

    @pytest.mark.asyncio
    async def test_post_tweet_exactly_280_does_not_raise(self):
        text = "x" * 280
        mock_response = {"data": {"id": "999", "text": text}}
        with patch.object(tc, "_twitter_request", new=AsyncMock(return_value=mock_response)):
            result = await tc.post_tweet(text)
        assert result == mock_response

    @pytest.mark.asyncio
    async def test_post_tweet_validates_length_message_includes_count(self):
        long_text = "y" * 300
        with pytest.raises(ValueError) as exc_info:
            await tc.post_tweet(long_text)
        assert "300" in str(exc_info.value)


# ─── search_mentions ─────────────────────────────────

class TestSearchMentions:
    @pytest.mark.asyncio
    async def test_search_mentions(self):
        mock_response = {
            "data": [
                {"id": "1", "text": "@rami hello!", "author_id": "42"}
            ],
            "meta": {"result_count": 1},
        }
        with patch.object(tc, "_twitter_request", new=AsyncMock(return_value=mock_response)) as mock_req:
            result = await tc.search_mentions("rami")

        # Verify _twitter_request was called with correct args
        mock_req.assert_called_once()
        call_kwargs = mock_req.call_args
        assert call_kwargs.args[0] == "GET"
        assert call_kwargs.args[1] == "/tweets/search/recent"
        assert call_kwargs.kwargs.get("use_bearer") is True
        # Query should contain the username
        assert "@rami" in call_kwargs.kwargs["params"]["query"]
        assert result == mock_response

    @pytest.mark.asyncio
    async def test_search_mentions_with_since_id(self):
        mock_response = {"data": [], "meta": {"result_count": 0}}
        with patch.object(tc, "_twitter_request", new=AsyncMock(return_value=mock_response)) as mock_req:
            result = await tc.search_mentions("rami", since_id="555")

        call_kwargs = mock_req.call_args
        assert call_kwargs.kwargs["params"]["since_id"] == "555"

    @pytest.mark.asyncio
    async def test_search_mentions_max_results_capped(self):
        mock_response = {"data": []}
        with patch.object(tc, "_twitter_request", new=AsyncMock(return_value=mock_response)) as mock_req:
            await tc.search_mentions("rami", max_results=200)

        call_kwargs = mock_req.call_args
        # Should be capped at 100
        assert int(call_kwargs.kwargs["params"]["max_results"]) <= 100


# ─── Additional coverage ─────────────────────────────

class TestOAuth1Header:
    def test_oauth1_header_returns_string_starting_with_oauth(self):
        # Set minimal env so function doesn't error on empty strings
        import os
        os.environ.setdefault("TWITTER_API_KEY", "test_key")
        os.environ.setdefault("TWITTER_API_SECRET", "test_secret")
        os.environ.setdefault("TWITTER_ACCESS_TOKEN", "test_token")
        os.environ.setdefault("TWITTER_ACCESS_SECRET", "test_token_secret")

        header = tc._oauth1_header("POST", "https://api.x.com/2/tweets")
        assert header.startswith("OAuth ")
        assert "oauth_signature=" in header
        assert "oauth_consumer_key=" in header
        assert "oauth_nonce=" in header

    def test_oauth1_header_different_nonce_each_call(self):
        header1 = tc._oauth1_header("POST", "https://api.x.com/2/tweets")
        header2 = tc._oauth1_header("POST", "https://api.x.com/2/tweets")
        # Nonces should differ between calls
        assert header1 != header2


class TestPostThread:
    @pytest.mark.asyncio
    async def test_post_thread_calls_post_tweet_sequentially(self):
        responses = [
            {"data": {"id": "1", "text": "First"}},
            {"data": {"id": "2", "text": "Second"}},
        ]
        call_count = 0

        async def mock_post_tweet(text, reply_to=None):
            nonlocal call_count
            r = responses[call_count]
            call_count += 1
            return r

        with patch.object(tc, "post_tweet", side_effect=mock_post_tweet):
            result = await tc.post_thread(["First", "Second"])

        assert len(result) == 2
        assert call_count == 2

    @pytest.mark.asyncio
    async def test_post_thread_second_tweet_replies_to_first(self):
        captured_calls: list[dict] = []

        async def mock_post_tweet(text, reply_to=None):
            captured_calls.append({"text": text, "reply_to": reply_to})
            # Return fake tweet id so threading works
            tweet_id = str(len(captured_calls))
            return {"data": {"id": tweet_id, "text": text}}

        with patch.object(tc, "post_tweet", side_effect=mock_post_tweet):
            await tc.post_thread(["Tweet 1", "Tweet 2", "Tweet 3"])

        assert captured_calls[0]["reply_to"] is None
        assert captured_calls[1]["reply_to"] == "1"
        assert captured_calls[2]["reply_to"] == "2"
