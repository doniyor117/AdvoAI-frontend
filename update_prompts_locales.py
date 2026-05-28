import json

with open("locales.json", "r", encoding="utf-8") as f:
    data = json.load(f)

# English
data["en"]["prompts"] = {
  "draft_custom_contract": "I want to draft a new custom contract. Please ask me questions to guide me through the drafting process.",
  "draft_template_contract": "I want to draft a new {templateId} contract. Please use the standard template as a base.",
  "compare_contracts": "Compare these contracts. Identify discrepancies, missing clauses, and risks.",
  "summarize_agreement": "Please summarize this agreement. Highlight key clauses, obligations, and potential risks."
}

# Uzbek
data["uz"]["prompts"] = {
  "draft_custom_contract": "Yangi maxsus shartnoma tuzmoqchiman. Iltimos, loyihani tuzish jarayonida menga yo'l-yo'riq ko'rsatish uchun savollar bering.",
  "draft_template_contract": "Yangi {templateId} shartnomasini tuzmoqchiman. Iltimos, asos sifatida standart shablondan foydalaning.",
  "compare_contracts": "Ushbu shartnomalarni taqqoslang. Tafovutlar, yetishmayotgan bandlar va xavflarni aniqlang.",
  "summarize_agreement": "Iltimos, ushbu kelishuvni xulosa qiling. Asosiy bandlar, majburiyatlar va potentsial xavflarni ajratib ko'rsating."
}

# Russian
data["ru"]["prompts"] = {
  "draft_custom_contract": "Я хочу составить новый индивидуальный договор. Пожалуйста, задавайте мне вопросы, чтобы провести через процесс составления.",
  "draft_template_contract": "Я хочу составить новый договор ({templateId}). Пожалуйста, используйте стандартный шаблон в качестве основы.",
  "compare_contracts": "Сравните эти договоры. Выявите расхождения, недостающие пункты и риски.",
  "summarize_agreement": "Пожалуйста, резюмируйте это соглашение. Выделите ключевые пункты, обязательства и возможные риски."
}

with open("locales.json", "w", encoding="utf-8") as f:
    json.dump(data, f, indent=2, ensure_ascii=False)
