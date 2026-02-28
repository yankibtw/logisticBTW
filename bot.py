import asyncio
import json
import os
from datetime import datetime
from dotenv import load_dotenv
from aiogram import Bot, Dispatcher, types, F
from aiogram.filters import Command
from aiogram.types import WebAppInfo, FSInputFile, ReplyKeyboardMarkup
from aiogram.utils.keyboard import ReplyKeyboardBuilder

load_dotenv()

TOKEN = os.getenv("BOT_TOKEN")
WEBAPP_URL = os.getenv("WEBAPP_URL", "") 
API_URL = os.getenv("API_URL", "") 

EXPORTS_DIR = "exports"
os.makedirs(EXPORTS_DIR, exist_ok=True)

bot = Bot(token=TOKEN)
dp = Dispatcher()

def get_main_menu():
    builder = ReplyKeyboardBuilder()
    builder.button(
        text="📦 Открыть склад", 
        web_app=WebAppInfo(url=WEBAPP_URL)
    )
    builder.button(text="📊 Статистика")
    builder.button(text="❓ Помощь")
    builder.adjust(1)
    return builder.as_markup(resize_keyboard=True)

@dp.message(Command("start"))
async def cmd_start(message: types.Message):
    await message.answer(
        "👋 **Добро пожаловать в LogisticBTW!**\n\n"
        "Это приложение для управления складом.\n\n"
        "📱 **Как использовать:**\n"
        "1. Нажмите кнопку '📦 Открыть склад' ниже\n"
        "2. Добавляйте товары, управляйте остатками\n"
        "3. Нажмите '📥 Экспорт JSON' в приложении\n"
        "4. Файл придёт вам в этот чат!\n\n"
        "💡 **Совет:** Данные сохраняются в браузере. "
        "Если очистите кэш - данные пропадут!",
        reply_markup=get_main_menu(),
        parse_mode="Markdown"
    )

@dp.message(F.text == "📊 Статистика")
async def show_stats(message: types.Message):
    await message.answer(
        "📊 **Статистика:**\n\n"
        "Данные хранятся в вашем браузере (Web App).\n"
        "Для просмотра статистики откройте приложение "
        "и посмотрите в верхней панели.",
        parse_mode="Markdown"
    )

@dp.message(F.text == "❓ Помощь")
async def cmd_help(message: types.Message):
    await message.answer(
        "📖 **Помощь по использованию:**\n\n"
        "🔹 **Добавить товар:**\n"
        "  - Нажмите '➕ Добавить товар'\n"
        "  - Введите название и количество\n\n"
        "🔹 **Редактировать:**\n"
        "  - Нажмите '✏️ Изменить' на карточке товара\n\n"
        "🔹 **Удалить товар:**\n"
        "  - Нажмите '🗑️ Удалить' на карточке\n\n"
        "🔹 **Экспорт данных:**\n"
        "  - Нажмите '📥 Экспорт JSON' в приложении\n"
        "  - Файл придёт вам в этот чат!\n\n"
        "⚠️ **Важно:**\n"
        "Данные хранятся в браузере (localStorage). "
        "Не очищайте кэш браузера!",
        parse_mode="Markdown"
    )

@dp.message(F.web_app_data)
async def handle_webapp_data(message: types.Message):
    """Получает данные из Web App и отправляет файл"""
    try:
        data_string = message.web_app_data.data
        export_data = json.loads(data_string)
        
        filename = f"warehouse_{datetime.now().strftime('%Y%m%d_%H%M')}.json"
        with open(filename, 'w', encoding='utf-8') as f:
            json.dump(export_data, f, ensure_ascii=False, indent=2)
        
        await message.answer_document(
            document=FSInputFile(filename),
            caption=f"📥 **Ваши данные склада**\n\n"
                   f"📅 Дата экспорта: {export_data.get('export_date', 'N/A')}\n"
                   f"📦 Товаров: {len(export_data.get('products', []))}\n\n"
                   f"Файл можно импортировать в Google Sheets!",
            parse_mode="Markdown"
        )
        
        os.remove(filename)
        
    except json.JSONDecodeError:
        await message.answer("❌ Ошибка: некорректные данные от Web App")
    except Exception as e:
        await message.answer(f"❌ Ошибка: {str(e)}")
        print(f"Error in webapp_data handler: {e}")

async def main():
    print("🤖 Бот запущен...")
    print(f"🌐 Web App URL: {WEBAPP_URL}")
    await dp.start_polling(bot)

if __name__ == "__main__":

    asyncio.run(main())
