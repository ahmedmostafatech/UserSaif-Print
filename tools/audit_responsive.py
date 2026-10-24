import asyncio
import http.server
import socketserver
import threading
import os
import sys
import json
from playwright.async_api import async_playwright

PORT = 8765
WORKSPACE_DIR = r"d:\UserSaif-Print"

PAGES = [
    "index.html",
    "services.html",
    "portfolio.html",
    "about.html",
    "track.html",
    "request.html",
    "policies.html",
    "admin.html"
]

VIEWPORTS = [
    320, 360, 375, 390, 414, 430, 480, 600, 768, 820, 1024, 1280, 1366, 1440, 1600, 1920, 2560
]

class QuietHandler(http.server.SimpleHTTPRequestHandler):
    def log_message(self, format, *args):
        pass

def start_server():
    os.chdir(WORKSPACE_DIR)
    handler = QuietHandler
    server = socketserver.TCPServer(("127.0.0.1", PORT), handler)
    thread = threading.Thread(target=server.serve_forever, daemon=True)
    thread.start()
    return server

CHECK_OVERFLOW_JS = """
() => {
    const docWidth = document.documentElement.clientWidth;
    const scrollWidth = document.documentElement.scrollWidth;
    const bodyScrollWidth = document.body ? document.body.scrollWidth : 0;
    const maxScroll = Math.max(scrollWidth, bodyScrollWidth);
    const hasHorizontalOverflow = maxScroll > docWidth + 1; // 1px threshold for subpixel

    const overflowingElements = [];
    if (hasHorizontalOverflow) {
        const allElements = document.querySelectorAll('*');
        for (const el of allElements) {
            // ignore script, style, head, dialogs not open
            if (['SCRIPT', 'STYLE', 'HEAD', 'META', 'TITLE'].includes(el.tagName)) continue;
            const rect = el.getBoundingClientRect();
            // In RTL, overflow can be left < 0 or right > docWidth
            const style = window.getComputedStyle(el);
            if (style.display === 'none' || style.visibility === 'hidden' || style.opacity === '0') continue;

            const isOverflowingRight = rect.right > docWidth + 2;
            const isOverflowingLeft = rect.left < -2;

            if (isOverflowingRight || isOverflowingLeft) {
                let identifier = el.tagName.toLowerCase();
                if (el.id) identifier += '#' + el.id;
                if (el.className && typeof el.className === 'string') {
                    identifier += '.' + el.className.trim().split(/\\s+/).slice(0, 3).join('.');
                }
                overflowingElements.push({
                    identifier: identifier,
                    left: Math.round(rect.left),
                    right: Math.round(rect.right),
                    width: Math.round(rect.width),
                    docWidth: docWidth,
                    text: (el.textContent || '').trim().slice(0, 40)
                });
            }
        }
    }

    return {
        docWidth: docWidth,
        scrollWidth: maxScroll,
        hasHorizontalOverflow: hasHorizontalOverflow,
        overflowDelta: maxScroll - docWidth,
        overflowingElements: overflowingElements.slice(0, 15)
    };
}
"""

async def run_audit():
    server = start_server()
    print(f"Server started on http://127.0.0.1:{PORT}")

    output_dir = r"C:\Users\HEMA\.gemini\antigravity-ide\brain\173c4665-c1c7-4603-9bce-1fa52765b827\scratch\baseline_audit"
    os.makedirs(output_dir, exist_ok=True)
    os.makedirs(os.path.join(output_dir, "screenshots"), exist_ok=True)

    results = []

    async with async_playwright() as p:
        browser = await p.chromium.launch()
        
        for page_name in PAGES:
            print(f"\\n--- Auditing {page_name} ---")
            page_results = {"page": page_name, "viewports": {}}
            page = await browser.new_page()
            
            console_errors = []
            page.on("console", lambda msg: console_errors.append(msg.text) if msg.type == "error" else None)
            
            url = f"http://127.0.0.1:{PORT}/{page_name}"
            
            for vp in VIEWPORTS:
                await page.set_viewport_size({"width": vp, "height": 800})
                try:
                    await page.goto(url, wait_until="networkidle", timeout=10000)
                except Exception as e:
                    try:
                        await page.goto(url, wait_until="load", timeout=5000)
                    except Exception:
                        pass
                
                await page.wait_for_timeout(300)
                
                # Check overflow
                overflow_info = await page.evaluate(CHECK_OVERFLOW_JS)
                
                status = "PASSED"
                if overflow_info["hasHorizontalOverflow"]:
                    status = "OVERFLOW"
                    print(f"  [!] {page_name} @ {vp}px: Overflow {overflow_info['overflowDelta']}px (doc: {overflow_info['docWidth']}, scroll: {overflow_info['scrollWidth']})")
                    for el in overflow_info["overflowingElements"][:3]:
                        print(f"      Element: {el['identifier']} [L:{el['left']}, R:{el['right']}, W:{el['width']}]")
                
                # Capture mobile screenshot for key viewports
                if vp in [320, 375, 414, 768, 1280]:
                    ss_path = os.path.join(output_dir, "screenshots", f"{page_name}_{vp}.png")
                    await page.screenshot(path=ss_path, full_page=False)

                page_results["viewports"][vp] = {
                    "status": status,
                    "overflow": overflow_info
                }
            
            page_results["console_errors"] = console_errors
            results.append(page_results)
            await page.close()

        await browser.close()

    summary_file = os.path.join(output_dir, "audit_summary.json")
    with open(summary_file, "w", encoding="utf-8") as f:
        json.dump(results, f, ensure_ascii=False, indent=2)
    print(f"\\nAudit complete! Saved to {summary_file}")

if __name__ == "__main__":
    asyncio.run(run_audit())
