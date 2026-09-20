# Generate the explainer voiceover (edge-tts) and print each line's duration
# (used to time the Remotion scenes). Run: python gen_vo.py
import asyncio
import edge_tts

VOICE = "en-US-AriaNeural"
RATE = "-4%"

LINES = [
    "This is Homework Studio. It turns your teaching material into a whole learning loop — here's how.",
    "It starts with the teacher. Upload a lesson — a PDF, a photo, or plain notes.",
    "The AI reads it and builds three things: a custom exam, teaching notes, and a tutor that knows your class.",
    "You stay in control. The AI flags its least-confident questions for you to check — approve, and publish to your students.",
    "Students take it, graded in an instant — and they level up, with points, streaks, badges, and a class leaderboard.",
    "Parents see the whole child — grades and effort — with a warm tip on exactly how to help at home.",
    "And leaders get the school at a glance — engagement, trends, the hardest questions, and reports written all on their own.",
    "Homework Studio — from your material, to learning kids actually love.",
]


async def synth(i, text):
    comm = edge_tts.Communicate(text, VOICE, rate=RATE)
    last = 0
    with open(f"public/vo/explainer_{i}.mp3", "wb") as f:
        async for ch in comm.stream():
            if ch["type"] == "audio":
                f.write(ch["data"])
            elif ch["type"] in ("WordBoundary", "SentenceBoundary"):
                last = max(last, ch["offset"] + ch["duration"])
    return last / 1e7  # 100-ns units -> seconds


async def main():
    durs = []
    for i, text in enumerate(LINES, 1):
        d = await synth(i, text)
        durs.append(round(d, 2))
        print(f"line {i}: {d:.2f}s")
    print("DURS", durs)


asyncio.run(main())
