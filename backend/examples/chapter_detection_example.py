#!/usr/bin/env python3
"""Example demonstrating the chapter boundary detection approach.

This shows how the system:
1. Identifies N chapters
2. Generates unique start/end patterns for each
3. Validates exactly one match per pattern
4. Verifies extracted content with LLM
"""

import sys
from pathlib import Path

import anyio

# Add backend to path
sys.path.insert(0, str(Path(__file__).parent.parent))

from readerai.pipeline.chapter_boundary_detector import ChapterDetector

# Example book text
EXAMPLE_BOOK = """
THE CHRONICLES OF DISCOVERY
By A. Uthor

Contents:
- Prologue: The Ancient Map
- Chapter 1: The Mysterious Letter
- Chapter 2: Journey to the Mountains
- Chapter 3: The Hidden Valley
- Chapter 4: Secrets Revealed
- Epilogue: A New Beginning

=====================================

PROLOGUE: The Ancient Map

In the dusty archives of the old library, a forgotten map lay hidden between
the pages of an ancient tome. Its edges were worn, its ink faded, but the
secrets it held would soon change everything...

The map showed paths through mountains that no modern cartographer had ever
documented, leading to a valley that existed in no contemporary atlas.

CHAPTER 1: The Mysterious Letter

Dr. Sarah Chen was sorting through her morning mail when she found it—a
letter with no return address, sealed with burgundy wax. The paper felt old,
far older than anything that should have been in her mailbox.

"Dear Dr. Chen," it began, "Your expertise in ancient languages is required
for a matter of utmost importance. The map you published last year was
incomplete. I have the missing piece."

The letter was signed only with a symbol she had seen before, in the margins
of medieval manuscripts: a serpent eating its own tail.

CHAPTER 2: Journey to the Mountains

The trek began at dawn. Sarah had assembled a small team: Marcus, an
experienced mountaineer; Li Wei, a historian specializing in the region;
and Emma, a cartographer whose modern equipment would complement the ancient map.

The first three days took them through well-known trails, but on the fourth
day, they reached the point where the ancient map diverged from all modern
routes. Here, they had to make a choice: follow the familiar path, or trust
in the cryptic directions of a centuries-old document.

They chose the ancient way.

CHAPTER 3: The Hidden Valley

The passage through the mountain was narrow, barely wide enough for one
person at a time. It wound through the rock like a serpent, sometimes
ascending steeply, sometimes plunging into darkness that their lights could
barely penetrate.

Then, suddenly, they emerged into sunlight. Before them lay a valley that
should not exist—a perfect bowl of green surrounded by sheer cliffs, with a
crystalline lake at its center. And there, on the far shore, stood structures
that made Sarah's breath catch in her throat.

"Those buildings," whispered Li Wei, "they match the architectural style of
the Lost Dynasty. But that's impossible. They vanished a thousand years ago."

CHAPTER 4: Secrets Revealed

The structures were perfectly preserved, as if their builders had left only
yesterday. Inside the largest building, they found the answer to the mystery:
a chamber filled with scrolls, artifacts, and at its center, a stone tablet
covered in the same ancient script Sarah had spent years studying.

As she translated the text, the truth emerged. The Lost Dynasty hadn't
vanished—they had retreated here, to this hidden sanctuary, taking with them
knowledge that the outside world had thought lost forever.

"Look at this," Emma said, pointing to a detailed map on the wall. "They
knew about places we're only discovering now. They had trade routes to
continents that Europeans wouldn't 'discover' for another five hundred years."

EPILOGUE: A New Beginning

Six months later, Sarah stood before a packed auditorium, preparing to share
their discoveries with the world. The hidden valley had been carefully
documented, its treasures catalogued, its secrets slowly being revealed.

But she knew this was only the beginning. The maps they had found showed
other hidden places, other secrets waiting to be discovered. The ancient map
that had started it all was just one piece of a much larger puzzle.

As she began her presentation, Sarah smiled. The world was about to become a
much more mysterious—and wonderful—place.

THE END
"""


async def demonstrate_chapter_detection():
    """Demonstrate the chapter detection approach."""
    print("CHAPTER BOUNDARY DETECTION")
    print("=" * 70)
    print()

    detector = ChapterDetector()

    # Step 1: Identify chapters
    print("Step 1: Identifying chapters in the text...")
    chapter_count, chapters = detector.identify_chapters(EXAMPLE_BOOK)

    print(f"\nFound {chapter_count} chapters:")
    for num, title in chapters:
        print(f"  {num}. {title}")

    # Step 2: Generate boundary patterns
    print("\n\nStep 2: Generating unique boundary patterns for each chapter...")
    boundary_pairs = await detector.generate_all_boundaries(EXAMPLE_BOOK, chapters)

    print("\nGenerated patterns:")
    for pair in boundary_pairs[:3]:  # Show first 3
        print(f"\nChapter {pair.chapter_number}: {pair.chapter_title}")
        print(f"  Start: {pair.start_pattern[:60]}...")
        print(f"  End: {pair.end_pattern[:60]}...")

    # Step 3: Validate patterns
    print("\n\nStep 3: Validating patterns (must match exactly once)...")
    validated_pairs = detector.validate_patterns(EXAMPLE_BOOK, boundary_pairs)

    valid_count = sum(1 for p in validated_pairs if p.is_valid)
    print(
        f"\nValidation results: {valid_count}/{len(validated_pairs)} patterns are valid"
    )

    for pair in validated_pairs:
        status = "✓" if pair.is_valid else "✗"
        print(f"  {status} Chapter {pair.chapter_number}: ", end="")
        if pair.is_valid:
            print(f"Start at line {pair.start_line}, End at line {pair.end_line}")
        else:
            print("Invalid pattern matches")

    # Step 4: Extract and verify
    print("\n\nStep 4: Extracting chapters and verifying with LLM...")
    results = await detector.extract_all_chapters(EXAMPLE_BOOK)

    print("\nExtraction complete. Results:")
    print("-" * 50)

    for result in results:
        status = "✓ Verified" if result.verification_passed else "✗ Failed"
        print(f"\nChapter {result.chapter_number}: {result.chapter_title}")
        print(f"  Status: {status}")
        print(f"  Words: {result.word_count}")
        print(f"  Preview: {result.text[:100]}...")
        if result.verification_notes:
            print(f"  Notes: {result.verification_notes}")

    # Summary
    verified = sum(1 for r in results if r.verification_passed)
    print("\n\nSUMMARY")
    print("-" * 50)
    print(f"Total chapters extracted: {len(results)}")
    print(f"Successfully verified: {verified}/{len(results)}")
    print(f"Success rate: {verified / len(results) * 100:.1f}%")


def main():
    """Run the demonstration."""
    try:
        anyio.run(demonstrate_chapter_detection)
        print("\n✓ Demonstration completed successfully!")
    except KeyboardInterrupt:
        print("\n\nInterrupted by user.")
    except Exception as e:
        print(f"\n✗ Error: {e}")
        import traceback

        traceback.print_exc()
        return 1

    return 0


if __name__ == "__main__":
    sys.exit(main())
