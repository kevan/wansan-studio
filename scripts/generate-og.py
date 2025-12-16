from PIL import Image, ImageDraw, ImageFont
import os

def create_og_image_with_logo():
    # 1. 画布设置
    W, H = 1200, 630
    bg_color = (255, 255, 255) # 纯白背景
    img = Image.new('RGB', (W, H), bg_color)
    draw = ImageDraw.Draw(img)

    # 2. 字体设置 (macOS 路径，Windows用户请改为 "arial.ttf")
    # 为了效果好，建议使用粗体
    try:
        font_title = ImageFont.truetype("/System/Library/Fonts/HelveticaNeue.ttc", 80, index=1) # Bold
        font_subtitle = ImageFont.truetype("/System/Library/Fonts/HelveticaNeue.ttc", 50, index=1) # Bold
        font_slogan = ImageFont.truetype("/System/Library/Fonts/HelveticaNeue.ttc", 45, index=0) # Regular
    except:
        # 回退方案：尝试加载 Arial
        try:
            font_title = ImageFont.truetype("Arial.ttf", 80)
            font_subtitle = ImageFont.truetype("Arial.ttf", 50)
            font_slogan = ImageFont.truetype("Arial.ttf", 45)
        except:
            print("警告：未找到标准字体，使用默认像素字体，效果可能不佳。")
            font_title = ImageFont.load_default()
            font_subtitle = ImageFont.load_default()
            font_slogan = ImageFont.load_default()

    # 3. 布局坐标
    padding_x = 80
    center_y = H // 2

    # 4. 绘制 Logo (Icon)
    # 假设 icon.png 是正方形，我们把它缩放到 120x120
    icon_size = 120
    try:
        if os.path.exists("../resources/icon.png"):
            logo = Image.open("../resources/icon.png").convert("RGBA")
            logo = logo.resize((icon_size, icon_size), Image.Resampling.LANCZOS)
            # 放置在左上角稍微往下一点，或者标题上方
            # 方案：放在标题正上方，形成垂直对齐的品牌区
            logo_y = center_y - 180
            img.paste(logo, (padding_x, logo_y), logo)
        else:
            print("未找到 icon.png，跳过 Logo 绘制")
    except Exception as e:
        print(f"Logo 绘制出错: {e}")

    # 5. 绘制文字
    # 标题在 Logo 下方 20px
    text_start_y = center_y - 40

    # Title: Wansan Studio
    draw.text((padding_x, text_start_y), "Wansan Studio", font=font_title, fill=(17, 24, 39))

    # Subtitle: Local-First Chat BI
    draw.text((padding_x, text_start_y + 110), "Local-First Chat BI", font=font_subtitle, fill=(17, 24, 39))

    # Slogan
    draw.text((padding_x, text_start_y + 180), "Your Data. Your Device.", font=font_slogan, fill=(107, 114, 128))

    # 6. 绘制右侧截图 (带阴影效果)
    try:
        screenshot_path = "../resources/screenshot.png"
        if os.path.exists(screenshot_path):
            screen = Image.open(screenshot_path).convert("RGBA")

            # 调整高度以适应画布，留出上下边距
            target_h = 500
            ratio = target_h / screen.height
            target_w = int(screen.width * ratio)
            screen = screen.resize((target_w, target_h), Image.Resampling.LANCZOS)

            # 简单的阴影效果 (灰色矩形)
            shadow = Image.new('RGBA', (target_w, target_h), (0, 0, 0, 0))
            shadow_draw = ImageDraw.Draw(shadow)
            shadow_draw.rectangle([10, 10, target_w, target_h], fill=(0,0,0, 50)) # 半透明黑

            # 粘贴阴影
            paste_x = 700
            paste_y = (H - target_h) // 2
            img.paste(shadow, (paste_x, paste_y), shadow)

            # 粘贴截图 (稍微错开一点，制造悬浮感)
            img.paste(screen, (paste_x - 5, paste_y - 5), screen)

        else:
            print("未找到截图文件")
    except Exception as e:
        print(f"截图绘制出错: {e}")

    # 7. 保存结果
    img.save("../resources/og-image.png")
    print("✅ og-image.png 生成完毕！")

if __name__ == "__main__":
    create_og_image_with_logo()
