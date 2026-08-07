"""atlas/bot.py -- Discord bot for atlas. Currently just /runresults. No
Discord bot infrastructure existed in this repo before this task -- this
creates the entrypoint from scratch.

Reads DISCORD_BOT_TOKEN and RESULTS_CHANNEL_ID from env. Admin restriction
uses Discord's native slash-command default_permissions(administrator=True)
rather than a hardcoded role/user-ID list -- the simplest reliable gate,
and a server owner can further narrow it in Discord's own integration
settings without a code change.

UNVERIFIED like the rest of atlas's external integrations: written without
a real bot token/server to run this against, so the discord.py API usage
below (app_commands, defer/followup, default_permissions) reflects the
library's documented interface but hasn't been exercised against a live
Discord connection. Unit tests exercise the command's callback directly
with a mocked Interaction instead (see test_bot.py).
"""
import asyncio
import os

import discord
from discord import app_commands

from atlas import results as atlas_results

DISCORD_BOT_TOKEN = os.environ.get("DISCORD_BOT_TOKEN")
RESULTS_CHANNEL_ID = os.environ.get("RESULTS_CHANNEL_ID")

MAX_LISTED_ISSUES = 10
DISCORD_MESSAGE_CHUNK = 1900  # stay under Discord's 2000-char message limit

intents = discord.Intents.default()
client = discord.Client(intents=intents)
tree = app_commands.CommandTree(client)


def format_issues(label: str, items: list[dict], reason_key: str) -> str:
    if not items:
        return ""
    lines = [f"**{label} ({len(items)}):**"]
    for item in items[:MAX_LISTED_ISSUES]:
        lines.append(f"- {item['subject']} (pick {item['pick_id']}): {item[reason_key]}")
    if len(items) > MAX_LISTED_ISSUES:
        lines.append(f"...and {len(items) - MAX_LISTED_ISSUES} more")
    return "\n".join(lines)


async def _post_caption(interaction: discord.Interaction, caption: str, dry_run: bool) -> None:
    if dry_run:
        await interaction.followup.send(f"[DRY RUN -- not posted] {caption}", ephemeral=True)
        return

    channel = client.get_channel(int(RESULTS_CHANNEL_ID)) if RESULTS_CHANNEL_ID else None
    if channel is None:
        await interaction.followup.send(
            f"⚠️ RESULTS_CHANNEL_ID not configured or channel not found -- caption not posted:\n{caption}",
            ephemeral=True,
        )
        return

    await channel.send(caption)
    await interaction.followup.send(f"Posted to {channel.mention}: {caption}", ephemeral=True)


async def _report_issues(interaction: discord.Interaction, summary: dict) -> None:
    issue_report = "\n\n".join(
        filter(
            None,
            [
                format_issues("Skipped", summary["skipped"], "reason"),
                format_issues("Errors", summary["errors"], "error"),
            ],
        )
    )
    if not issue_report:
        await interaction.followup.send("No skips or errors.", ephemeral=True)
        return
    for start in range(0, len(issue_report), DISCORD_MESSAGE_CHUNK):
        await interaction.followup.send(issue_report[start : start + DISCORD_MESSAGE_CHUNK], ephemeral=True)


@tree.command(name="runresults", description="Grade settled picks and post the results caption")
@app_commands.describe(dry_run="Preview without writing to the database or posting to the results channel")
@app_commands.default_permissions(administrator=True)
async def runresults(interaction: discord.Interaction, dry_run: bool = False):
    await interaction.response.defer(ephemeral=True, thinking=True)

    try:
        summary = await asyncio.to_thread(atlas_results.run, dry_run=dry_run)
    except Exception as exc:
        await interaction.followup.send(f"❌ /runresults failed before grading anything: {exc}", ephemeral=True)
        return

    caption = atlas_results.caption(summary)
    await _post_caption(interaction, caption, dry_run)
    await _report_issues(interaction, summary)


@client.event
async def on_ready():
    await tree.sync()
    print(f"Logged in as {client.user}")


def main():
    if not DISCORD_BOT_TOKEN:
        raise RuntimeError("DISCORD_BOT_TOKEN must be set")
    client.run(DISCORD_BOT_TOKEN)


if __name__ == "__main__":
    main()
