import json

with open("locales.json", "r", encoding="utf-8") as f:
    data = json.load(f)

# English
data["en"]["wizard"] = {
  "title": "Create Contract",
  "guided_interview": "Guided Interview",
  "start_template": "Start from Template",
  "employment_contract": "Employment Contract",
  "employment_desc": "Standard Uzb compliant",
  "nda": "Non-Disclosure Agreement",
  "nda_desc": "Protect your secrets",
  "lease": "Residential Lease",
  "lease_desc": "Standard rental agreement",
  "service_agreement": "Service Agreement",
  "service_desc": "B2B service terms"
}
data["en"]["settings"].update({
  "security": "Security",
  "change_password": "Change Password",
  "google_no_password": "You registered with Google. You can set a password from the forgot password page.",
  "current_password": "Current Password",
  "new_password": "New Password",
  "confirm_new_password": "Confirm New Password",
  "update_password": "Update Password",
  "change_email": "Change Email Address",
  "new_email": "New Email Address",
  "request_email_change": "Request Email Change",
  "verification_code": "Verification Code",
  "verify_and_update": "Verify & Update",
  "cancel": "Cancel",
  "linked_accounts": "Linked Accounts",
  "google_account": "Google Account",
  "connected": "Connected",
  "not_connected": "Not connected",
  "disconnect": "Disconnect",
  "connect": "Connect"
})

# Uzbek
data["uz"]["wizard"] = {
  "title": "Shartnoma yaratish",
  "guided_interview": "Bosqichma-bosqich so'rov",
  "start_template": "Shablondan boshlash",
  "employment_contract": "Mehnat shartnomasi",
  "employment_desc": "O'zbekiston qonunchiligiga mos",
  "nda": "Maxfiylik kelishuvi",
  "nda_desc": "Sirlaringizni himoya qiling",
  "lease": "Turar-joy ijarasi",
  "lease_desc": "Standart ijara shartnomasi",
  "service_agreement": "Xizmat ko'rsatish shartnomasi",
  "service_desc": "B2B xizmat shartlari"
}
data["uz"]["settings"].update({
  "security": "Xavfsizlik",
  "change_password": "Parolni o'zgartirish",
  "google_no_password": "Siz Google orqali ro'yxatdan o'tgansiz. Parolni tiklash sahifasidan parol o'rnatishingiz mumkin.",
  "current_password": "Joriy parol",
  "new_password": "Yangi parol",
  "confirm_new_password": "Yangi parolni tasdiqlang",
  "update_password": "Parolni yangilash",
  "change_email": "Elektron pochtani o'zgartirish",
  "new_email": "Yangi elektron pochta",
  "request_email_change": "O'zgartirishni so'rash",
  "verification_code": "Tasdiqlash kodi",
  "verify_and_update": "Tasdiqlash va yangilash",
  "cancel": "Bekor qilish",
  "linked_accounts": "Ulangan hisoblar",
  "google_account": "Google hisobi",
  "connected": "Ulangan",
  "not_connected": "Ulanmagan",
  "disconnect": "Uzish",
  "connect": "Ulash"
})

# Russian
data["ru"]["wizard"] = {
  "title": "Создание договора",
  "guided_interview": "Пошаговое интервью",
  "start_template": "Начать с шаблона",
  "employment_contract": "Трудовой договор",
  "employment_desc": "По стандартам РУз",
  "nda": "Соглашение о неразглашении",
  "nda_desc": "Защитите ваши секреты",
  "lease": "Аренда жилья",
  "lease_desc": "Стандартный договор аренды",
  "service_agreement": "Договор оказания услуг",
  "service_desc": "Условия B2B услуг"
}
data["ru"]["settings"].update({
  "security": "Безопасность",
  "change_password": "Изменить пароль",
  "google_no_password": "Вы зарегистрировались через Google. Вы можете установить пароль на странице забытого пароля.",
  "current_password": "Текущий пароль",
  "new_password": "Новый пароль",
  "confirm_new_password": "Подтвердите новый пароль",
  "update_password": "Обновить пароль",
  "change_email": "Изменить email",
  "new_email": "Новый email",
  "request_email_change": "Запросить изменение",
  "verification_code": "Код подтверждения",
  "verify_and_update": "Подтвердить и обновить",
  "cancel": "Отмена",
  "linked_accounts": "Привязанные аккаунты",
  "google_account": "Аккаунт Google",
  "connected": "Подключено",
  "not_connected": "Не подключено",
  "disconnect": "Отключить",
  "connect": "Подключить"
})

with open("locales.json", "w", encoding="utf-8") as f:
    json.dump(data, f, indent=2, ensure_ascii=False)
