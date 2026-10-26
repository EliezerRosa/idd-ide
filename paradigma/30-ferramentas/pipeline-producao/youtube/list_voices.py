import asyncio
import edge_tts

async def list_pt():
    voices = await edge_tts.list_voices()
    for v in voices:
        if v["Locale"].startswith("pt-BR"):
            print(v["ShortName"], v["Gender"])

asyncio.run(list_pt())
