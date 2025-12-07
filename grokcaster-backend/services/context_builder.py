from typing import Dict, Any, Optional

# Duration configs - words per duration (at ~150 words/min speech)
DURATION_CONFIGS = {
    "30sec": {"words": 60, "lines": 4},
    "45sec": {"words": 90, "lines": 6},
    "1min": {"words": 140, "lines": 8},
    "2min": {"words": 280, "lines": 14},
    "3min": {"words": 420, "lines": 20},
    "5min": {"words": 700, "lines": 32},
    "7min": {"words": 1000, "lines": 44},
    "10min": {"words": 1400, "lines": 60},
}


def build_outline_prompt(
    page_text: str,
    page_title: Optional[str],
    user_signals: Dict[str, Any],
    tone: str,
    target_duration: str,
    mode: str = "podcast",
    x_influence: str = "medium"
) -> tuple:
    """Build prompt for podcast script generation."""
    
    config = DURATION_CONFIGS.get(target_duration, DURATION_CONFIGS["1min"])
    word_limit = config["words"]
    line_limit = config["lines"]
    
    page_snippet = page_text[:3000]
    title_line = f"Topic: {page_title}" if page_title else ""
    
    # Mode instructions
    if mode == "summary":
        mode_inst = "Quick summary - Alex asks, Sam explains key points."
    elif mode == "debate":
        mode_inst = "Debate style - Alex and Sam take opposing views."
    else:
        mode_inst = "Natural podcast conversation - Alex is curious, Sam is the expert."
    
    # X interests integration
    interests_text = ""
    if user_signals and x_influence != "minimal":
        interests = user_signals.get("interests", [])
        bio = user_signals.get("bio", "")
        if interests:
            interests_text = f"\nUser interests to weave in naturally: {', '.join(interests[:5])}"
        if bio:
            interests_text += f"\nUser context: {bio[:100]}"
    
    is_unhinged = tone.lower() == "unhinged"
    
    prompt = f"""
{mode_inst}

{title_line}
CONTENT:
{page_snippet}
{interests_text}

REQUIREMENTS:
- Write exactly {line_limit} lines (alternating ALEX: and SAM:)
- Keep each line SHORT (15-25 words max)
- Target ~{word_limit} words total for {target_duration} duration
- Make it sound natural when spoken aloud

Format:
ALEX: [sentence]
SAM: [sentence]
...

Start with ALEX:"""

    return prompt.strip(), is_unhinged
