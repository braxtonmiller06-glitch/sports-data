"""Tests for atlas/bot.py. No live Discord connection -- discord.Interaction
and the bot's channel lookup are mocked; the /runresults command's callback
is invoked directly (discord.py's standard pattern for unit-testing slash
commands without a running bot).
"""
import unittest
from unittest.mock import AsyncMock, MagicMock, patch

from atlas import bot


class FormatIssuesTests(unittest.TestCase):
    def test_empty_list_returns_empty_string(self):
        self.assertEqual(bot.format_issues("Skipped", [], "reason"), "")

    def test_lists_each_item_with_reason(self):
        items = [{"pick_id": 1, "subject": "Yankees", "reason": "no matching game"}]
        text = bot.format_issues("Skipped", items, "reason")
        self.assertIn("Yankees", text)
        self.assertIn("no matching game", text)
        self.assertIn("Skipped (1)", text)

    def test_truncates_beyond_max_listed(self):
        items = [{"pick_id": i, "subject": f"Team {i}", "reason": "x"} for i in range(15)]
        text = bot.format_issues("Skipped", items, "reason")
        self.assertIn("...and 5 more", text)


class RunResultsCommandTests(unittest.IsolatedAsyncioTestCase):
    def _make_interaction(self):
        interaction = MagicMock()
        interaction.response.defer = AsyncMock()
        interaction.followup.send = AsyncMock()
        return interaction

    async def test_dry_run_does_not_touch_the_channel(self):
        interaction = self._make_interaction()
        summary = {"graded": [], "skipped": [], "errors": []}

        with patch("atlas.bot.atlas_results.run", return_value=summary) as mock_run, \
                patch("atlas.bot.atlas_results.caption", return_value="caption text"), \
                patch.object(bot.client, "get_channel") as mock_get_channel:
            await bot.runresults.callback(interaction, dry_run=True)

        mock_run.assert_called_once_with(dry_run=True)
        mock_get_channel.assert_not_called()
        sent_texts = [call.args[0] for call in interaction.followup.send.call_args_list]
        self.assertTrue(any("DRY RUN" in t for t in sent_texts))

    async def test_normal_run_posts_to_configured_channel(self):
        interaction = self._make_interaction()
        summary = {"graded": [{"pick_id": 1, "subject": "A", "result": "WIN", "stake": 10.0, "decimal_odds": 2.0}],
                   "skipped": [], "errors": []}
        mock_channel = MagicMock()
        mock_channel.send = AsyncMock()
        mock_channel.mention = "#results"

        with patch("atlas.bot.atlas_results.run", return_value=summary), \
                patch("atlas.bot.atlas_results.caption", return_value="caption text"), \
                patch.object(bot.client, "get_channel", return_value=mock_channel), \
                patch.object(bot, "RESULTS_CHANNEL_ID", "12345"):
            await bot.runresults.callback(interaction, dry_run=False)

        mock_channel.send.assert_called_once_with("caption text")

    async def test_missing_channel_config_reports_instead_of_crashing(self):
        interaction = self._make_interaction()
        summary = {"graded": [], "skipped": [], "errors": []}

        with patch("atlas.bot.atlas_results.run", return_value=summary), \
                patch("atlas.bot.atlas_results.caption", return_value="caption text"), \
                patch.object(bot, "RESULTS_CHANNEL_ID", None):
            await bot.runresults.callback(interaction, dry_run=False)

        sent_texts = [call.args[0] for call in interaction.followup.send.call_args_list]
        self.assertTrue(any("not configured" in t for t in sent_texts))

    async def test_skipped_and_errors_are_reported_to_invoker(self):
        interaction = self._make_interaction()
        summary = {
            "graded": [],
            "skipped": [{"pick_id": 1, "subject": "A", "reason": "no game found"}],
            "errors": [{"pick_id": 2, "subject": "B", "error": "boom"}],
        }

        with patch("atlas.bot.atlas_results.run", return_value=summary), \
                patch("atlas.bot.atlas_results.caption", return_value="caption text"), \
                patch.object(bot, "RESULTS_CHANNEL_ID", None):
            await bot.runresults.callback(interaction, dry_run=True)

        sent_texts = "\n".join(call.args[0] for call in interaction.followup.send.call_args_list)
        self.assertIn("no game found", sent_texts)
        self.assertIn("boom", sent_texts)

    async def test_run_exception_is_reported_not_raised(self):
        interaction = self._make_interaction()

        with patch("atlas.bot.atlas_results.run", side_effect=RuntimeError("db is down")):
            await bot.runresults.callback(interaction, dry_run=False)

        sent_texts = [call.args[0] for call in interaction.followup.send.call_args_list]
        self.assertTrue(any("db is down" in t for t in sent_texts))

    async def test_command_defaults_to_admin_only_permissions(self):
        # default_permissions(administrator=True) is how discord.py gates a
        # slash command to admins by default -- assert the decorator set it.
        self.assertIsNotNone(bot.runresults.default_permissions)
        self.assertTrue(bot.runresults.default_permissions.administrator)


if __name__ == "__main__":
    unittest.main()
