import asyncio
import edge_tts

async def test():
    for name in ["pt-BR-AntonioNeural", "pt-BR-FranciscaNeural", "pt-BR-FabioNeural", "pt-BR-BrendaNeural"]:
        try:
            comm = edge_tts.Communicate("Teste de voz", name)
            await comm.save(f"test_{name}.mp3")
            print(f"[OK] {name}")
        except Exception as e:
            print(f"[FAIL] {name}: {e}")

asyncio.run(test())
