import asyncio
import http.server
import socketserver
import threading
import os
import sys

# Ensure UTF-8 output on Windows
if sys.stdout.encoding != 'utf-8':
    sys.stdout.reconfigure(encoding='utf-8', errors='replace')

from playwright.async_api import async_playwright

PORT = 8767
WORKSPACE_DIR = r"d:\UserSaif-Print"
OUTPUT_PDF = os.path.join(WORKSPACE_DIR, "UserSaif_Presentation.pdf")
SLIDE_PREVIEWS_DIR = os.path.join(WORKSPACE_DIR, "assets", "img", "presentation", "slide_previews")

class QuietHandler(http.server.SimpleHTTPRequestHandler):
    def log_message(self, format, *args):
        pass

def start_server():
    os.chdir(WORKSPACE_DIR)
    server = socketserver.TCPServer(("127.0.0.1", PORT), QuietHandler)
    thread = threading.Thread(target=server.serve_forever, daemon=True)
    thread.start()
    return server

async def export_presentation():
    server = start_server()
    print("Exporting presentation to PDF and slide image previews...")
    os.makedirs(SLIDE_PREVIEWS_DIR, exist_ok=True)

    async with async_playwright() as p:
        browser = await p.chromium.launch()
        page = await browser.new_page()
        
        # 16:9 1920x1080 viewport
        await page.set_viewport_size({"width": 1920, "height": 1080})
        await page.goto(f"http://127.0.0.1:{PORT}/presentation.html", wait_until="networkidle")
        await page.wait_for_timeout(500)

        # Generate PDF with 16:9 landscape aspect ratio
        await page.emulate_media(media="screen")
        await page.pdf(
            path=OUTPUT_PDF,
            width="16in",
            height="9in",
            print_background=True,
            margin={"top": "0", "bottom": "0", "left": "0", "right": "0"}
        )
        print(f"PDF exported to: {OUTPUT_PDF}")

        # Capture slide previews for slide 1, slide 4, slide 8, slide 9, slide 10
        total_slides = 12
        for s_idx in [0, 1, 3, 5, 7, 8, 9, 10]:
            await page.evaluate(f"window.updateSlide ? window.updateSlide({s_idx}) : null")
            # Click next or trigger slide activation directly
            await page.evaluate(f"""() => {{
                const slides = Array.from(document.querySelectorAll('.slide'));
                slides.forEach((s, i) => {{
                    if (i === {s_idx}) s.classList.add('is-active');
                    else s.classList.remove('is-active');
                }});
                const counter = document.getElementById('slide-counter');
                if (counter) counter.textContent = '{str(s_idx+1).zfill(2)} / 12';
            }}""")
            await page.wait_for_timeout(300)
            ss_path = os.path.join(SLIDE_PREVIEWS_DIR, f"slide_{s_idx+1}.png")
            await page.locator("#slide-stage").screenshot(path=ss_path)
            print(f"Captured preview of slide {s_idx+1}")

        await browser.close()
    print("Export completed successfully!")

if __name__ == "__main__":
    asyncio.run(export_presentation())
