import asyncio
import http.server
import socketserver
import threading
import os
import sys
import json

# Ensure UTF-8 output on Windows
if sys.stdout.encoding != 'utf-8':
    sys.stdout.reconfigure(encoding='utf-8', errors='replace')

from playwright.async_api import async_playwright

PORT = 8766
WORKSPACE_DIR = r"d:\UserSaif-Print"

class QuietHandler(http.server.SimpleHTTPRequestHandler):
    def log_message(self, format, *args):
        pass

def start_server():
    os.chdir(WORKSPACE_DIR)
    server = socketserver.TCPServer(("127.0.0.1", PORT), QuietHandler)
    thread = threading.Thread(target=server.serve_forever, daemon=True)
    thread.start()
    return server

CHECK_TOUCH_TARGETS_JS = """
() => {
    const interactives = document.querySelectorAll('button, a, input, select, textarea, [role="button"], [tabindex="0"]');
    const smallTargets = [];
    for (const el of interactives) {
        if (el.offsetParent === null) continue; // hidden
        const rect = el.getBoundingClientRect();
        const style = window.getComputedStyle(el);
        if (style.display === 'none' || style.visibility === 'hidden' || style.opacity === '0') continue;
        // ignore inline text links inside paragraphs
        if (el.tagName === 'A' && el.parentElement && ['P', 'SPAN', 'LI'].includes(el.parentElement.tagName) && !el.classList.contains('btn')) {
            continue;
        }
        if (rect.width > 0 && rect.height > 0 && (rect.width < 36 || rect.height < 36)) {
            let id = el.tagName.toLowerCase();
            if (el.id) id += '#' + el.id;
            if (el.className) id += '.' + el.className.split(' ').slice(0, 2).join('.');
            smallTargets.push({
                identifier: id,
                width: Math.round(rect.width),
                height: Math.round(rect.height),
                text: (el.textContent || el.value || el.getAttribute('aria-label') || '').trim().slice(0, 25)
            });
        }
    }
    return smallTargets.slice(0, 10);
}
"""

CHECK_OVERFLOW_JS = """
() => {
    const docWidth = document.documentElement.clientWidth;
    const scrollWidth = document.documentElement.scrollWidth;
    const bodyScroll = document.body ? document.body.scrollWidth : 0;
    const maxScroll = Math.max(scrollWidth, bodyScroll);
    const hasOverflow = maxScroll > docWidth + 1;
    let overflowing = [];
    if (hasOverflow) {
        document.querySelectorAll('*').forEach(el => {
            if (['SCRIPT','STYLE','HEAD','META'].includes(el.tagName)) return;
            const r = el.getBoundingClientRect();
            const s = window.getComputedStyle(el);
            if (s.display === 'none' || s.visibility === 'hidden' || s.opacity === '0') return;
            if (r.right > docWidth + 2 || r.left < -2) {
                let id = el.tagName.toLowerCase();
                if (el.id) id += '#' + el.id;
                if (el.className && typeof el.className === 'string') id += '.' + el.className.trim().split(/\\s+/).slice(0,2).join('.');
                overflowing.push({
                    id: id,
                    left: Math.round(r.left),
                    right: Math.round(r.right),
                    width: Math.round(r.width),
                    text: (el.textContent || '').trim().slice(0, 30)
                });
            }
        });
    }
    return {
        hasOverflow: hasOverflow,
        docWidth: docWidth,
        scrollWidth: maxScroll,
        delta: maxScroll - docWidth,
        overflowing: overflowing.slice(0, 8)
    };
}
"""

async def run_interactive_tests():
    server = start_server()
    print("Testing interactive states across mobile viewports...")

    VIEWPORTS = [320, 375, 414, 768, 1024, 1440]
    output_dir = r"C:\Users\HEMA\.gemini\antigravity-ide\brain\173c4665-c1c7-4603-9bce-1fa52765b827\scratch\interactive_audit"
    os.makedirs(output_dir, exist_ok=True)
    os.makedirs(os.path.join(output_dir, "screens"), exist_ok=True)

    async with async_playwright() as p:
        browser = await p.chromium.launch()
        
        # 1. Test Navigation Menu Open on Index
        print("\\n=== 1. Test Mobile Nav Drawer on index.html ===")
        page = await browser.new_page()
        for vp in [320, 375, 414, 768]:
            await page.set_viewport_size({"width": vp, "height": 700})
            await page.goto(f"http://127.0.0.1:{PORT}/index.html", wait_until="load")
            toggle = await page.query_selector("#nav-toggle")
            if toggle and await toggle.is_visible():
                await toggle.click()
                await page.wait_for_timeout(200)
                ov = await page.evaluate(CHECK_OVERFLOW_JS)
                print(f"  Nav open @ {vp}px: Overflow={ov['hasOverflow']} (delta={ov['delta']}px)")
                await page.screenshot(path=os.path.join(output_dir, "screens", f"nav_open_{vp}.png"))
        await page.close()

        # 2. Test Services Wizard Open (Click first service card)
        print("\\n=== 2. Test Services Wizard on services.html ===")
        page = await browser.new_page()
        for vp in [320, 360, 375, 414, 480, 768]:
            await page.set_viewport_size({"width": vp, "height": 800})
            await page.goto(f"http://127.0.0.1:{PORT}/services.html", wait_until="load")
            await page.wait_for_timeout(400)
            # Click first card if exists or trigger hash
            first_card = await page.query_selector(".service-card")
            if first_card:
                await first_card.click()
            else:
                await page.goto(f"http://127.0.0.1:{PORT}/services.html#wizard-section", wait_until="load")
            await page.wait_for_timeout(500)
            
            ov = await page.evaluate(CHECK_OVERFLOW_JS)
            print(f"  Wizard @ {vp}px: Overflow={ov['hasOverflow']} (delta={ov['delta']}px)")
            if ov['hasOverflow']:
                for item in ov['overflowing']:
                    print(f"     -> {item['id']}: L={item['left']}, R={item['right']}, W={item['width']} ({item['text']})")
            await page.screenshot(path=os.path.join(output_dir, "screens", f"services_wizard_{vp}.png"))

            # Test step 2 and step 3
            btn_next = await page.query_selector("#btn-step-next")
            if btn_next and await btn_next.is_visible():
                await btn_next.click()
                await page.wait_for_timeout(300)
                ov_step2 = await page.evaluate(CHECK_OVERFLOW_JS)
                if ov_step2['hasOverflow']:
                    print(f"     Step 2 @ {vp}px: Overflow={ov_step2['delta']}px")
        await page.close()

        # 3. Test Portfolio Details Modal
        print("\\n=== 3. Test Portfolio Modal on portfolio.html ===")
        page = await browser.new_page()
        for vp in [320, 375, 414, 768]:
            await page.set_viewport_size({"width": vp, "height": 700})
            await page.goto(f"http://127.0.0.1:{PORT}/portfolio.html", wait_until="load")
            await page.wait_for_timeout(400)
            card = await page.query_selector(".portfolio-card__open")
            if card:
                await card.click()
                await page.wait_for_timeout(300)
                ov = await page.evaluate(CHECK_OVERFLOW_JS)
                print(f"  Portfolio Modal @ {vp}px: Overflow={ov['hasOverflow']} (delta={ov['delta']}px)")
                await page.screenshot(path=os.path.join(output_dir, "screens", f"portfolio_modal_{vp}.png"))
        await page.close()

        # 4. Test Track.html result screen
        print("\\n=== 4. Test Track Result on track.html ===")
        page = await browser.new_page()
        for vp in [320, 375, 414, 768]:
            await page.set_viewport_size({"width": vp, "height": 700})
            await page.goto(f"http://127.0.0.1:{PORT}/track.html", wait_until="load")
            await page.wait_for_timeout(300)
            inp = await page.query_selector("#track-input")
            btn = await page.query_selector("#track-btn")
            if inp and btn:
                await inp.fill("YS-2401")
                await btn.click()
                await page.wait_for_timeout(500)
                ov = await page.evaluate(CHECK_OVERFLOW_JS)
                print(f"  Track Result @ {vp}px: Overflow={ov['hasOverflow']} (delta={ov['delta']}px)")
                if ov['hasOverflow']:
                    for item in ov['overflowing']:
                        print(f"     -> {item['id']}: L={item['left']}, R={item['right']}, W={item['width']}")
                await page.screenshot(path=os.path.join(output_dir, "screens", f"track_result_{vp}.png"))
        await page.close()

        # 5. Test Admin Dashboard Screen
        print("\\n=== 5. Test Admin App on admin.html ===")
        page = await browser.new_page()
        for vp in [320, 375, 414, 768, 1024]:
            await page.set_viewport_size({"width": vp, "height": 700})
            # Bypass login directly via localStorage or script
            await page.goto(f"http://127.0.0.1:{PORT}/admin.html", wait_until="load")
            await page.evaluate("""() => {
                sessionStorage.setItem('ys_admin_auth', 'true');
                if (window.showApp) window.showApp();
            }""")
            await page.reload(wait_until="load")
            await page.wait_for_timeout(400)
            ov = await page.evaluate(CHECK_OVERFLOW_JS)
            print(f"  Admin Dashboard @ {vp}px: Overflow={ov['hasOverflow']} (delta={ov['delta']}px)")
            if ov['hasOverflow']:
                for item in ov['overflowing']:
                    print(f"     -> {item['id']}: L={item['left']}, R={item['right']}, W={item['width']} ({item['text']})")
            await page.screenshot(path=os.path.join(output_dir, "screens", f"admin_dash_{vp}.png"))
        await page.close()

        await browser.close()
    print("\\nInteractive testing completed!")

if __name__ == "__main__":
    asyncio.run(run_interactive_tests())
