import os
import sys
from pptx import Presentation
from pptx.util import Inches, Pt
from pptx.dml.color import RGBColor
from pptx.enum.text import PP_ALIGN, MSO_ANCHOR
from pptx.enum.shapes import MSO_SHAPE

# Paths
BASE_DIR = r"d:\UserSaif-Print"
IMG_DIR = os.path.join(BASE_DIR, "assets", "img")
PREVIEW_DIR = os.path.join(IMG_DIR, "presentation")
OUTPUT_PPTX = os.path.join(BASE_DIR, "UserSaif_Presentation.pptx")

# Colors
C_INK = RGBColor(10, 46, 50)
C_TEAL_DARK = RGBColor(14, 59, 64)
C_TEAL_PRI = RGBColor(17, 72, 80)
C_TEAL_ACC = RGBColor(143, 198, 202)
C_AMBER = RGBColor(235, 130, 60)
C_PAPER = RGBColor(248, 247, 244)
C_WHITE = RGBColor(255, 255, 255)
C_MUTED = RGBColor(90, 110, 115)
C_CARD_BG = RGBColor(255, 255, 255)
C_BORDER = RGBColor(213, 225, 226)
C_SUCCESS = RGBColor(27, 107, 69)

def create_presentation():
    prs = Presentation()
    # 16:9 widescreen
    prs.slide_width = Inches(13.333)
    prs.slide_height = Inches(7.5)
    blank_layout = prs.slide_layouts[6]

    def add_bg(slide, color):
        bg = slide.shapes.add_shape(MSO_SHAPE.RECTANGLE, 0, 0, Inches(13.333), Inches(7.5))
        bg.fill.solid()
        bg.fill.fore_color.rgb = color
        bg.line.fill.background()
        return bg

    def add_header(slide, eyebrow, title, desc, is_dark=False):
        # Eyebrow
        tb_eye = slide.shapes.add_textbox(Inches(0.8), Inches(0.5), Inches(11.7), Inches(0.35))
        tf_eye = tb_eye.text_frame
        tf_eye.word_wrap = True
        p_eye = tf_eye.paragraphs[0]
        p_eye.text = eyebrow.upper()
        p_eye.font.size = Pt(11)
        p_eye.font.bold = True
        p_eye.font.color.rgb = C_AMBER if is_dark else C_TEAL_PRI

        # Title
        tb_title = slide.shapes.add_textbox(Inches(0.8), Inches(0.85), Inches(11.7), Inches(0.65))
        tf_title = tb_title.text_frame
        tf_title.word_wrap = True
        p_title = tf_title.paragraphs[0]
        p_title.text = title
        p_title.font.size = Pt(24)
        p_title.font.bold = True
        p_title.font.color.rgb = C_WHITE if is_dark else C_INK

        # Desc
        if desc:
            tb_desc = slide.shapes.add_textbox(Inches(0.8), Inches(1.5), Inches(11.7), Inches(0.45))
            tf_desc = tb_desc.text_frame
            tf_desc.word_wrap = True
            p_desc = tf_desc.paragraphs[0]
            p_desc.text = desc
            p_desc.font.size = Pt(13)
            p_desc.font.color.rgb = C_TEAL_ACC if is_dark else C_MUTED

    # ==========================================
    # SLIDE 1: Title Slide (Dark)
    # ==========================================
    s1 = prs.slides.add_slide(blank_layout)
    add_bg(s1, C_TEAL_DARK)

    # Logo
    logo_path = os.path.join(IMG_DIR, "logo.png")
    if os.path.exists(logo_path):
        s1.shapes.add_picture(logo_path, Inches(0.8), Inches(0.8), Inches(1.1), Inches(1.1))

    tb_sub = s1.shapes.add_textbox(Inches(2.1), Inches(0.9), Inches(10), Inches(0.9))
    tf_sub = tb_sub.text_frame
    p1 = tf_sub.paragraphs[0]
    p1.text = "يوزرسيف | UserSaif Studio"
    p1.font.size = Pt(20)
    p1.font.bold = True
    p1.font.color.rgb = C_WHITE
    p2 = tf_sub.add_paragraph()
    p2.text = "استوديو الطباعة والتخصيص الحرفي بأسوان • IEEE Aswan SB Brand & Build"
    p2.font.size = Pt(13)
    p2.font.color.rgb = C_TEAL_ACC

    # Main Title
    tb_main = s1.shapes.add_textbox(Inches(0.8), Inches(2.6), Inches(11.7), Inches(2.8))
    tf_main = tb_main.text_frame
    tf_main.word_wrap = True
    p_m1 = tf_main.paragraphs[0]
    p_m1.text = "منصة يوزرسيف المتكاملة"
    p_m1.font.size = Pt(40)
    p_m1.font.bold = True
    p_m1.font.color.rgb = C_WHITE
    p_m2 = tf_main.add_paragraph()
    p_m2.text = "للطباعة الحرفية وتخصيص المنتجات وإدارة الإنتاج"
    p_m2.font.size = Pt(32)
    p_m2.font.bold = True
    p_m2.font.color.rgb = C_AMBER
    p_m3 = tf_main.add_paragraph()
    p_m3.text = "هندسة واجهات متقدمة، معالج مواصفات تفاعلي، محرك فحص الجاهزية وتتبع حي للحالات عبر Supabase"
    p_m3.font.size = Pt(15)
    p_m3.font.color.rgb = C_TEAL_ACC

    # Footer team
    tb_foot = s1.shapes.add_textbox(Inches(0.8), Inches(6.0), Inches(11.7), Inches(0.9))
    tf_foot = tb_foot.text_frame
    p_f1 = tf_foot.paragraphs[0]
    p_f1.text = "فريق الهندسة والتطوير: Ahmed Mostafa & Ebrahim Ashraf & Omar Mohamed"
    p_f1.font.size = Pt(14)
    p_f1.font.bold = True
    p_f1.font.color.rgb = C_WHITE
    p_f2 = tf_foot.add_paragraph()
    p_f2.text = "Vanilla HTML5/CSS3/ES6+ • Supabase Database & RLS • Mobile-First (17 Tested Viewports)"
    p_f2.font.size = Pt(12)
    p_f2.font.color.rgb = C_TEAL_ACC

    # ==========================================
    # SLIDE 2: Project Overview & Context
    # ==========================================
    s2 = prs.slides.add_slide(blank_layout)
    add_bg(s2, C_PAPER)
    add_header(s2, "نظرة عامة وأهداف التحدي", "الرؤية والهدف: نقل الحرفة من العشوائية إلى الأرشفة الرقمية",
               "تمكين العلامة التجارية المحلية بأسوان من امتلاك منصة ويب مستقلة فائقة الأداء تسهل طلبات التخصيص.")

    cards_s2 = [
        ("🎯 تخصيص معياري دقيق", "استبدال الوصف النصي العشوائي بمصفوفة مواصفات رقمية دقيقة (أوزان GSM، سواتش الألوان، توزيع المقاسات، ومواضع الطباعة الميكانيكية).", C_TEAL_PRI),
        ("🛡️ محرك الجاهزية والضمان", "فحص أبعاد وملفات التصميم لحظياً عبر readiness.js للتأكد من جودة الدقة DPI وصلاحية الطباعة مع ضمان 100% ضد عيوب الصناعة.", C_AMBER),
        ("📊 تتبع ومراقبة حية", "توليد معرف طلب فريد (YS-2401) يتيح للعميل تتبع مسار تصنيع طلبه عبر 6 محطات فنية واضحة مع لوحة تحكم لصاحب المشروع.", C_TEAL_PRI)
    ]
    for i, (head, body, acc_col) in enumerate(cards_s2):
        left = Inches(0.8 + i * 3.9)
        top = Inches(2.2)
        shape = s2.shapes.add_shape(MSO_SHAPE.ROUNDED_RECTANGLE, left, top, Inches(3.7), Inches(3.6))
        shape.fill.solid()
        shape.fill.fore_color.rgb = C_WHITE
        shape.line.color.rgb = acc_col
        shape.line.width = Pt(2)
        tf = shape.text_frame
        tf.word_wrap = True
        p_h = tf.paragraphs[0]
        p_h.text = head
        p_h.font.size = Pt(17)
        p_h.font.bold = True
        p_h.font.color.rgb = C_INK
        p_b = tf.add_paragraph()
        p_b.text = body
        p_b.font.size = Pt(13)
        p_b.font.color.rgb = C_MUTED

    # Bottom quote
    b_quote = s2.shapes.add_shape(MSO_SHAPE.RECTANGLE, Inches(0.8), Inches(6.1), Inches(11.7), Inches(0.8))
    b_quote.fill.solid()
    b_quote.fill.fore_color.rgb = RGBColor(238, 246, 246)
    b_quote.line.color.rgb = C_TEAL_ACC
    tf_q = b_quote.text_frame
    p_q = tf_q.paragraphs[0]
    p_q.text = "هوية يوزرسيف بأسوان: «خليك مختلف .. خليك يوزرسيف» — الجمع بين أصالة الحرفة والتقنيات الرقمية المباشرة (DTF / Laser Die-Cut)."
    p_q.font.size = Pt(12)
    p_q.font.bold = True
    p_q.font.color.rgb = C_TEAL_PRI

    # ==========================================
    # SLIDE 3: Problem vs. Solution
    # ==========================================
    s3 = prs.slides.add_slide(blank_layout)
    add_bg(s3, C_TEAL_DARK)
    add_header(s3, "المشكلة والحل الهندسي", "التحديات الواقعية في صناعة الطباعة الشخصية والحل التقني",
               "مقارنة تحليلية بين الاختناقات التشغيلية للأساليب التقليدية وبديل منصة يوزرسيف الرقمية.", True)

    # Box 1: Problem
    b_prob = s3.shapes.add_shape(MSO_SHAPE.ROUNDED_RECTANGLE, Inches(0.8), Inches(2.2), Inches(5.7), Inches(4.6))
    b_prob.fill.solid()
    b_prob.fill.fore_color.rgb = RGBColor(25, 45, 50)
    b_prob.line.color.rgb = RGBColor(200, 70, 70)
    b_prob.line.width = Pt(2)
    tf_p = b_prob.text_frame
    tf_p.word_wrap = True
    p1 = tf_p.paragraphs[0]
    p1.text = "❌ الوضع التقليدي (Chat & Social DMs)"
    p1.font.size = Pt(18)
    p1.font.bold = True
    p1.font.color.rgb = RGBColor(255, 130, 120)

    prob_items = [
        "فقدان تفاصيل الطلب: ضياع المقاسات والألوان وسط مئات محادثات واتساب غير المفهرسة.",
        "ملفات رديئة الجودة: استلام صور مضغوطة غير صالحة لقص الليزر أو ألواح السلك سكرين.",
        "انعدام الشفافية: استنزاف الوقت في الرد على تساؤلات 'طلبي وصل فين؟' بصورة يدوية متكررة."
    ]
    for item in prob_items:
        p = tf_p.add_paragraph()
        p.text = "• " + item
        p.font.size = Pt(13)
        p.font.color.rgb = RGBColor(230, 230, 230)

    # Box 2: Solution
    b_sol = s3.shapes.add_shape(MSO_SHAPE.ROUNDED_RECTANGLE, Inches(6.8), Inches(2.2), Inches(5.7), Inches(4.6))
    b_sol.fill.solid()
    b_sol.fill.fore_color.rgb = RGBColor(25, 45, 50)
    b_sol.line.color.rgb = C_TEAL_ACC
    b_sol.line.width = Pt(2)
    tf_s = b_sol.text_frame
    tf_s.word_wrap = True
    p2 = tf_s.paragraphs[0]
    p2.text = "✔️ منصة يوزرسيف الهندسية (Digital Atelier)"
    p2.font.size = Pt(18)
    p2.font.bold = True
    p2.font.color.rgb = C_TEAL_ACC

    sol_items = [
        "معالج مواصفات تفاعلي (Wizard): حساب آلي للأسعار وتوزيع ذكي للمقاسات يمنع الخطأ البشري.",
        "فحص الجاهزية الآلي (Readiness): تدقيق فوري لنسب الأبعاد وصيغ Vector/PNG قبل إتمام الحفظ.",
        "تتبع حي 6 مراحل بـ Supabase: استعلام فوري برقم الطلب والهاتف يوضح الموقف التنفيذي وتاريخ كل إجراء."
    ]
    for item in sol_items:
        p = tf_s.add_paragraph()
        p.text = "• " + item
        p.font.size = Pt(13)
        p.font.color.rgb = C_WHITE

    # ==========================================
    # SLIDE 4: End-to-End User Journey
    # ==========================================
    s4 = prs.slides.add_slide(blank_layout)
    add_bg(s4, C_PAPER)
    add_header(s4, "رحلة المستخدم المتكاملة", "مسار انسيابي فائق السهولة من الاستكشاف وحتى الاستلام",
               "خريطة تدفق تجربة المستخدم (UX Flow) المصممة لتسهيل الشراء للعميل وسرعة اتخاذ القرار للمشغل.")

    steps = [
        ("1. الاستكشاف والمعرض", "تصفح الهيرو الموزاييكي، فحص أركان الجودة وسابقة الأعمال المنفذة بأسوان."),
        ("2. المواصفات والخيارات", "تحديد نوع المنتج، خامات القطن، اللون، وتوزيع المقاسات بالعداد الذكي."),
        ("3. رفع التصميم والتحقق", "سحب وإفلات ملفات الشعار مع تدقيق الجاهزية وإمكانية تجميع سلة طلبات."),
        ("4. الإرسال والتتبع المباشر", "استلام كود الطلب (YS-XXXX) ومتابعة التحديثات اللحظية وموعد التجهيز."),
        ("5. إدارة المشغل والتنفيذ", "مراجعة الإدارة للملف الأصلي عالي الجودة، اتخاذ قرار الاعتماد والتحديث.")
    ]
    for i, (st, desc) in enumerate(steps):
        left = Inches(0.8 + i * 2.36)
        card = s4.shapes.add_shape(MSO_SHAPE.ROUNDED_RECTANGLE, left, Inches(2.3), Inches(2.2), Inches(3.6))
        card.fill.solid()
        card.fill.fore_color.rgb = C_WHITE
        card.line.color.rgb = C_BORDER
        tf = card.text_frame
        tf.word_wrap = True
        p_t = tf.paragraphs[0]
        p_t.text = st
        p_t.font.size = Pt(14)
        p_t.font.bold = True
        p_t.font.color.rgb = C_TEAL_PRI
        p_d = tf.add_paragraph()
        p_d.text = desc
        p_d.font.size = Pt(11.5)
        p_d.font.color.rgb = C_MUTED

    # Metrics row
    b_m = s4.shapes.add_shape(MSO_SHAPE.RECTANGLE, Inches(0.8), Inches(6.1), Inches(11.7), Inches(0.8))
    b_m.fill.solid()
    b_m.fill.fore_color.rgb = RGBColor(238, 246, 246)
    b_m.line.color.rgb = C_TEAL_ACC
    tf_m = b_m.text_frame
    p_m = tf_m.paragraphs[0]
    p_m.text = "مؤشرات التجربة: صفر تسجيل دخول مطلوب للعميل • 3 خطوات لإنهاء معالج الطلب • 100% توافق مع الشاشات اللمسية."
    p_m.font.size = Pt(12)
    p_m.font.bold = True
    p_m.font.color.rgb = C_INK

    # ==========================================
    # SLIDE 5: Core Functional Modules
    # ==========================================
    s5 = prs.slides.add_slide(blank_layout)
    add_bg(s5, C_PAPER)
    add_header(s5, "الميزات والموديولات الرئيسية", "بنية وظيفية متقدمة تغطي دورة حياة الطلب بالكامل",
               "مكونات برمجية مخصصة طُوّرت لتلبية متطلبات المشغل الفني وعملائه.")

    modules = [
        ("🎨 معالج المواصفات (Wizard)", "تبديل ديناميكي بين الملابس والسيراميك والستيكرات مع سواتش ألوان حية ومحدد مسار القص Die-Cut وحساب تكاليف آلي.", "services.html"),
        ("🖼️ معرض الكاروسيل والشبكة", "عرض أعمال المشغل بوضعين (كاروسيل سحب ناعم + شبكة كاملة) مع نافذة تفاصيل ومواصفات الخامات وإمكانية طلب تصميم مماثل.", "portfolio.html"),
        ("⏱️ التتبع الزمني الحي", "تايم لاين رقمي ذكي يتحول من أفقي على الديسكتوب إلى عمودي مريح على الموبايل برقم الهاتف وكود الطلب الفريد.", "track.html"),
        ("🔒 لوحة تحكم المشغل (Admin)", "مصادقة آمنة، فلترة بالحالات الفنية، فحص دقة التصاميم، واعتماد أو رفض مع كتابة مبررات فنية تفصيلية للعميل.", "admin.html")
    ]
    for i, (title, text, badge) in enumerate(modules):
        left = Inches(0.8 + i * 2.95)
        shape = s5.shapes.add_shape(MSO_SHAPE.ROUNDED_RECTANGLE, left, Inches(2.2), Inches(2.8), Inches(4.5))
        shape.fill.solid()
        shape.fill.fore_color.rgb = C_WHITE
        shape.line.color.rgb = C_BORDER
        tf = shape.text_frame
        tf.word_wrap = True
        p_t = tf.paragraphs[0]
        p_t.text = title
        p_t.font.size = Pt(15)
        p_t.font.bold = True
        p_t.font.color.rgb = C_TEAL_PRI
        p_b = tf.add_paragraph()
        p_b.text = text
        p_b.font.size = Pt(12)
        p_b.font.color.rgb = C_MUTED
        p_bg = tf.add_paragraph()
        p_bg.text = "[" + badge + "]"
        p_bg.font.size = Pt(11)
        p_bg.font.bold = True
        p_bg.font.color.rgb = C_AMBER

    # ==========================================
    # SLIDE 6: Technologies & Architecture
    # ==========================================
    s6 = prs.slides.add_slide(blank_layout)
    add_bg(s6, C_TEAL_DARK)
    add_header(s6, "المعمارية التقنية والبنية التحتية", "معمارية متينة بدون أطر عمل معقدة (No Framework Overhead)",
               "بناء الموقع باستخدام أحدث تقنيات الويب الأصلية لتحقيق سرعة تحميل فائقة واستقرار وأمان تام لقاعدة البيانات.", True)

    tb_t = s6.shapes.add_textbox(Inches(0.8), Inches(2.2), Inches(6.0), Inches(4.8))
    tf_t = tb_t.text_frame
    tf_t.word_wrap = True
    p1 = tf_t.paragraphs[0]
    p1.text = "طبقات المعمارية الهندسية:"
    p1.font.size = Pt(17)
    p1.font.bold = True
    p1.font.color.rgb = C_AMBER

    techs = [
        ("Presentation Layer:", "Semantic HTML5, Modular CSS Tokens, Flexbox & Grid."),
        ("Logic & Execution:", "Vanilla ES6+ JavaScript, Native Web APIs, IntersectionObserver, Async/Await."),
        ("Database Backend:", "Supabase PostgreSQL, Realtime DB, Stored Procedures (RPC)."),
        ("Security Engine:", "Row Level Security (RLS), Safe Data Escaping, Private Storage Buckets."),
        ("Design System:", "IBM Plex Sans Arabic, 8px Grid, CSS Fluid Typography, High-Contrast Tokens.")
    ]
    for lbl, desc in techs:
        p = tf_t.add_paragraph()
        run_lbl = p.add_run()
        run_lbl.text = "• " + lbl + " "
        run_lbl.font.size = Pt(13)
        run_lbl.font.bold = True
        run_lbl.font.color.rgb = C_AMBER
        
        run_desc = p.add_run()
        run_desc.text = desc
        run_desc.font.size = Pt(12)
        run_desc.font.color.rgb = C_WHITE

    # Data hierarchy box
    b_dh = s6.shapes.add_shape(MSO_SHAPE.ROUNDED_RECTANGLE, Inches(7.0), Inches(2.2), Inches(5.5), Inches(4.6))
    b_dh.fill.solid()
    b_dh.fill.fore_color.rgb = RGBColor(20, 48, 52)
    b_dh.line.color.rgb = C_TEAL_ACC
    tf_dh = b_dh.text_frame
    tf_dh.word_wrap = True
    p_dht = tf_dh.paragraphs[0]
    p_dht.text = "تسلسل تدفق البيانات (Data Access Flow):"
    p_dht.font.size = Pt(15)
    p_dht.font.bold = True
    p_dht.font.color.rgb = C_TEAL_ACC

    flow_code = (
        "1. config.js\n"
        "   └─ Supabase URL & Public Anon Key\n"
        "2. schema.js\n"
        "   └─ Domain Statuses & Timeline State Machine\n"
        "3. readiness.js\n"
        "   └─ Client-side Validation Engine\n"
        "4. api.js\n"
        "   └─ Safe DB Gates (Zero direct table queries)\n"
        "5. page-*.js\n"
        "   └─ DOM Binding & Reactive UI Presentation"
    )
    p_c = tf_dh.add_paragraph()
    p_c.text = flow_code
    p_c.font.size = Pt(12)
    p_c.font.color.rgb = C_WHITE

    # ==========================================
    # SLIDE 7: UI/UX & Design System
    # ==========================================
    s7 = prs.slides.add_slide(blank_layout)
    add_bg(s7, C_PAPER)
    add_header(s7, "نظام التصميم وتجربة المستخدم", "لغة بصرية موحدة وهوية أسوانية راقية",
               "مبني وفق شبكة مسافات هندسية 8px ومتغيرات مركزية موثقة في ملف tokens.css و base.css.")

    ds_items = [
        ("🎨 لوحة الألوان الرسمية", "• Deep Teal (#0E3B40): وقار وأصالة الحرفة\n• Teal Accent (#8FC6CA): إبراز العناصر التفاعلية\n• Sunset Amber (#EB823C): دفء شمس أسوان\n• Warm Paper (#F8F7F4): ملمس ورق طبيعي"),
        ("📐 الطباعة والمسافات", "• خط IBM Plex Sans Arabic للأحرف العربية الأصيلة\n• Fluid Typography بواسطة دوال clamp() المرنة\n• شبكة مسافات هندسية من --s-1 (8px) إلى --s-12 (96px)\n• أرقام إنجليزية tabular-nums لضبط محاذاة الأسعار"),
        ("♿ الإتاحة وتقليل الحركة", "• محرك تقليل الحركة (Reduced Motion) بزر مخصص بالفوتر\n• مساحات لمس قياسية لا تقل عن 44px وفق معايير WCAG 2.5\n• تباين لوني دقيق وإشارات أيقونية مرافقة لجميع الحالات")
    ]
    for i, (title, content) in enumerate(ds_items):
        left = Inches(0.8 + i * 3.9)
        shape = s7.shapes.add_shape(MSO_SHAPE.ROUNDED_RECTANGLE, left, Inches(2.2), Inches(3.7), Inches(4.5))
        shape.fill.solid()
        shape.fill.fore_color.rgb = C_WHITE
        shape.line.color.rgb = C_BORDER
        tf = shape.text_frame
        tf.word_wrap = True
        p_t = tf.paragraphs[0]
        p_t.text = title
        p_t.font.size = Pt(16)
        p_t.font.bold = True
        p_t.font.color.rgb = C_TEAL_PRI
        p_c = tf.add_paragraph()
        p_c.text = content
        p_c.font.size = Pt(12.5)
        p_c.font.color.rgb = C_MUTED

    # ==========================================
    # SLIDE 8: Responsive Engineering Across 17 Viewports
    # ==========================================
    s8 = prs.slides.add_slide(blank_layout)
    add_bg(s8, C_PAPER)
    add_header(s8, "الهندسة المتجاوبة والجاهزية للشاشات", "اختبار وتوافق دقيق عبر 17 مقاس شاشة مختلف",
               "من أصغر شاشات الهواتف (320px) وحتى الشاشات المكتبية بدقة 4K (2560px) بنهج Mobile-First خالص.")

    vp_box = s8.shapes.add_shape(MSO_SHAPE.RECTANGLE, Inches(0.8), Inches(2.2), Inches(11.7), Inches(1.0))
    vp_box.fill.solid()
    vp_box.fill.fore_color.rgb = RGBColor(238, 246, 246)
    vp_box.line.color.rgb = C_TEAL_ACC
    tf_vp = vp_box.text_frame
    p_vpt = tf_vp.paragraphs[0]
    p_vpt.text = "مصفوفة مقاسات العرض المختبرة آلياً بواسطة Playwright:"
    p_vpt.font.size = Pt(12)
    p_vpt.font.bold = True
    p_vpt.font.color.rgb = C_TEAL_PRI
    p_vps = tf_vp.add_paragraph()
    p_vps.text = "320px • 360px • 375px • 390px • 414px • 430px • 480px • 600px • 768px • 820px • 1024px • 1280px • 1366px • 1440px • 1600px • 1920px • 2560px"
    p_vps.font.size = Pt(11.5)
    p_vps.font.bold = True
    p_vps.font.color.rgb = C_INK

    break_cards = [
        ("📱 الهواتف (320px - 480px)", "قائمة درج كاملة الارتفاع، كروت تدفق رأسية، أزرار إجراءات مثبتة بأسفل الشاشة (Sticky CTA)، وتحويل الجداول إلى كروت ملخصة."),
        ("📟 الأجهزة اللوحية (600px - 960px)", "إعادة ترتيب الأعمدة إلى شبكة ثنائية (2-Column Grid)، الحفاظ على سهولة اللمس بالإبهام، وتحسين حجم الصور الموزاييكية."),
        ("🖥️ الشاشات المكتبية (1024px - 2560px)", "تخطيط متكامل بعمودين للطلب والمعاينة، تأثيرات تحويم ناعمة، ملاحة أفقية كاملة، وتثبيت شريط الطلب أثناء التمرير.")
    ]
    for i, (bt, bd) in enumerate(break_cards):
        left = Inches(0.8 + i * 3.9)
        shape = s8.shapes.add_shape(MSO_SHAPE.ROUNDED_RECTANGLE, left, Inches(3.5), Inches(3.7), Inches(3.4))
        shape.fill.solid()
        shape.fill.fore_color.rgb = C_WHITE
        shape.line.color.rgb = C_BORDER
        tf = shape.text_frame
        tf.word_wrap = True
        p_t = tf.paragraphs[0]
        p_t.text = bt
        p_t.font.size = Pt(15)
        p_t.font.bold = True
        p_t.font.color.rgb = C_TEAL_PRI
        p_d = tf.add_paragraph()
        p_d.text = bd
        p_d.font.size = Pt(12.5)
        p_d.font.color.rgb = C_MUTED

    # ==========================================
    # SLIDE 9: Visual Showcase - Desktop Experience
    # ==========================================
    s9 = prs.slides.add_slide(blank_layout)
    add_bg(s9, C_TEAL_DARK)
    add_header(s9, "معرض الواجهات الحقيقية • تجربة الديسكتوب", "فخامة التصميم البصري واستقرار الشاشات الكبيرة",
               "لقطات شاشة فعلية ملتقطة من الموقع الحي توضح تجانس العناصر والشبكة البصرية.", True)

    img_d1 = os.path.join(PREVIEW_DIR, "index.html_1280.png")
    img_d2 = os.path.join(PREVIEW_DIR, "portfolio.html_1280.png")

    if os.path.exists(img_d1):
        s9.shapes.add_picture(img_d1, Inches(0.8), Inches(2.3), Inches(5.7), Inches(4.2))
    if os.path.exists(img_d2):
        s9.shapes.add_picture(img_d2, Inches(6.8), Inches(2.3), Inches(5.7), Inches(4.2))

    tb_c1 = s9.shapes.add_textbox(Inches(0.8), Inches(6.6), Inches(5.7), Inches(0.4))
    tb_c1.text_frame.paragraphs[0].text = "الصفحة الرئيسية • الهيرو الموزاييكي وإحصائيات المشغل (1280px)"
    tb_c1.text_frame.paragraphs[0].font.size = Pt(11)
    tb_c1.text_frame.paragraphs[0].font.color.rgb = C_TEAL_ACC

    tb_c2 = s9.shapes.add_textbox(Inches(6.8), Inches(6.6), Inches(5.7), Inches(0.4))
    tb_c2.text_frame.paragraphs[0].text = "معرض الأعمال • كاروسيل الأرشيف البصري وفلاتر التصنيفات (1280px)"
    tb_c2.text_frame.paragraphs[0].font.size = Pt(11)
    tb_c2.text_frame.paragraphs[0].font.color.rgb = C_TEAL_ACC

    # ==========================================
    # SLIDE 10: Visual Showcase - Mobile Experience
    # ==========================================
    s10 = prs.slides.add_slide(blank_layout)
    add_bg(s10, C_PAPER)
    add_header(s10, "معرض الواجهات الحقيقية • تجربة الموبايل", "أعلى درجات الراحة والانسيابية على الهواتف الذكية",
               "لقطات حقيقية على مقاسات الشاشة الصعبة (320px - 414px) مع خلو كامل من أي تمدد أفقي أو تشويه نصي.")

    m_imgs = [
        ("index.html_375.png", "الرئيسية (iPhone 375px)"),
        ("services.html_375.png", "دليل الخدمات والمواصفات"),
        ("track.html_375.png", "تتبع الطلب بالهاتف والكود")
    ]
    for i, (fname, caption) in enumerate(m_imgs):
        fpath = os.path.join(PREVIEW_DIR, fname)
        left = Inches(1.5 + i * 3.7)
        if os.path.exists(fpath):
            s10.shapes.add_picture(fpath, left, Inches(2.3), Inches(2.8), Inches(4.3))
        tb_c = s10.shapes.add_textbox(left, Inches(6.7), Inches(2.8), Inches(0.4))
        p = tb_c.text_frame.paragraphs[0]
        p.text = caption
        p.font.size = Pt(11.5)
        p.font.bold = True
        p.font.color.rgb = C_TEAL_PRI
        p.alignment = PP_ALIGN.CENTER

    # ==========================================
    # SLIDE 11: QA Testing & Verified Results
    # ==========================================
    s11 = prs.slides.add_slide(blank_layout)
    add_bg(s11, C_PAPER)
    add_header(s11, "ضمان الجودة واختبارات الأتمتة", "تحديات هندسية حقيقية تم اكتشافها وحلها بالكامل",
               "توثيق الاختبارات الآلية والتحسينات الملموسة التي أُجريت أثناء دورة التطوير.")

    # Challenges box
    b_ch = s11.shapes.add_shape(MSO_SHAPE.ROUNDED_RECTANGLE, Inches(0.8), Inches(2.2), Inches(5.7), Inches(3.6))
    b_ch.fill.solid()
    b_ch.fill.fore_color.rgb = C_WHITE
    b_ch.line.color.rgb = C_AMBER
    tf_ch = b_ch.text_frame
    tf_ch.word_wrap = True
    p1 = tf_ch.paragraphs[0]
    p1.text = "🔍 تحديات تم اكتشافها أثناء التدقيق:"
    p1.font.size = Pt(16)
    p1.font.bold = True
    p1.font.color.rgb = C_AMBER

    ch_items = [
        "أوفر فلو 211px بمعالج الطلبات: تسبب زر تغيير الخدمة وشريط المواصفات في تمدد الصفحة لشاشات 320px–480px.",
        "لوحة تحكم المشغل بالهواتف: ثبات السايد بار بعرض 272px على الموبايل دون تحوله لدرج متحرك.",
        "مساحات لمس صغيرة بالهيدر: أزرار أقل من 40px تم رصدها على الهواتف المدمجة."
    ]
    for it in ch_items:
        p = tf_ch.add_paragraph()
        p.text = "• " + it
        p.font.size = Pt(12)
        p.font.color.rgb = C_MUTED

    # Fixes box
    b_fx = s11.shapes.add_shape(MSO_SHAPE.ROUNDED_RECTANGLE, Inches(6.8), Inches(2.2), Inches(5.7), Inches(3.6))
    b_fx.fill.solid()
    b_fx.fill.fore_color.rgb = C_WHITE
    b_fx.line.color.rgb = C_SUCCESS
    tf_fx = b_fx.text_frame
    tf_fx.word_wrap = True
    p2 = tf_fx.paragraphs[0]
    p2.text = "✅ الحلول والنتائج المؤكدة (PASSED):"
    p2.font.size = Pt(16)
    p2.font.bold = True
    p2.font.color.rgb = C_SUCCESS

    fx_items = [
        "Zero Horizontal Overflow: إعادة هيكلة الفلكس مع overflow-x: clip ليصبح الفائض 0px عبر كافة الشاشات.",
        "Off-Canvas Admin Drawer: تحويل سايد بار الإدارة إلى درج متحرك ناعم مع خلفية تعتيم Scrim.",
        "Safe-Area & Touch Compliance: ضبط هوامش الأمان للهواتف مع أحجام أزرار لمسية 44px قياسية."
    ]
    for it in fx_items:
        p = tf_fx.add_paragraph()
        p.text = "✓ " + it
        p.font.size = Pt(12)
        p.font.color.rgb = C_INK

    # Bottom stats
    b_st = s11.shapes.add_shape(MSO_SHAPE.RECTANGLE, Inches(0.8), Inches(6.1), Inches(11.7), Inches(0.8))
    b_st.fill.solid()
    b_st.fill.fore_color.rgb = RGBColor(227, 243, 234)
    b_st.line.color.rgb = C_SUCCESS
    tf_st = b_st.text_frame
    p_st = tf_st.paragraphs[0]
    p_st.text = "نتائج الفحص النهائي: 0px تمدد أفقي • 17 مقاس شاشة مجتاز بالكامل • 100% اختبارات مؤكدة بـ Playwright."
    p_st.font.size = Pt(13)
    p_st.font.bold = True
    p_st.font.color.rgb = C_SUCCESS
    p_st.alignment = PP_ALIGN.CENTER

    # ==========================================
    # SLIDE 12: Conclusion & Future Roadmap
    # ==========================================
    s12 = prs.slides.add_slide(blank_layout)
    add_bg(s12, C_TEAL_DARK)
    add_header(s12, "الخاتمة والتطلعات المستقبلية", "جاهزية كاملة للإطلاق ومسار تطوير مستمر",
               "مشروع متكامل يجمع بين الطابع الحرفي الأصيل والهندسة البرمجية الدقيقة لخدمة مجتمع أسوان.", True)

    fut_items = [
        ("💳 الدفع الإلكتروني المباشر", "تكامل بوابات الدفع المصرية المعتمدة (InstaPay / Fawry / محافظ المحمول) لتأكيد دفع العربون آلياً فور اعتماد الطلب."),
        ("👕 معاينة تفاعلية 3D", "دمج محرك ثلاثي الأبعاد (WebGL/Three.js) يتيح للعميل استعراض مجسم التيشيرت أو الماج بالطباعة قبل الإرسال."),
        ("📲 إشعارات واتساب السحابية", "ربط واتساب بيزنس كلاود عبر Webhooks لإرسال رسائل تحديث الحالة الفورية للعميل دون أي تدخل يدوي.")
    ]
    for i, (title, desc) in enumerate(fut_items):
        left = Inches(0.8 + i * 3.9)
        shape = s12.shapes.add_shape(MSO_SHAPE.ROUNDED_RECTANGLE, left, Inches(2.2), Inches(3.7), Inches(3.5))
        shape.fill.solid()
        shape.fill.fore_color.rgb = RGBColor(20, 48, 52)
        shape.line.color.rgb = C_TEAL_ACC
        tf = shape.text_frame
        tf.word_wrap = True
        p_t = tf.paragraphs[0]
        p_t.text = title
        p_t.font.size = Pt(16)
        p_t.font.bold = True
        p_t.font.color.rgb = C_TEAL_ACC
        p_d = tf.add_paragraph()
        p_d.text = desc
        p_d.font.size = Pt(12)
        p_d.font.color.rgb = C_WHITE

    # Thank you footer
    tb_ty = s12.shapes.add_textbox(Inches(0.8), Inches(6.0), Inches(11.7), Inches(0.9))
    tf_ty = tb_ty.text_frame
    p_ty1 = tf_ty.paragraphs[0]
    p_ty1.text = "شكراً لكم • جاهزون لأي أسئلة وملاحظات"
    p_ty1.font.size = Pt(20)
    p_ty1.font.bold = True
    p_ty1.font.color.rgb = C_WHITE
    p_ty1.alignment = PP_ALIGN.CENTER
    p_ty2 = tf_ty.add_paragraph()
    p_ty2.text = "استوديو يوزرسيف بأسوان — IEEE Aswan Student Branch Brand & Build Challenge"
    p_ty2.font.size = Pt(12)
    p_ty2.font.color.rgb = C_TEAL_ACC
    p_ty2.alignment = PP_ALIGN.CENTER

    prs.save(OUTPUT_PPTX)
    print(f"Presentation saved successfully to: {OUTPUT_PPTX}")

if __name__ == "__main__":
    create_presentation()
