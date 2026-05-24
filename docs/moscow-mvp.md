# MoSCoW / MVP

| Категория | Функция | Описание | Кто делает |
|---|---|---|---|
| Must | Камера | Получение видеопотока в браузере | Frontend / Integration |
| Must | Pose estimation | Определение keypoints головы и плеч через MoveNet | AI / CV |
| Must | Risk score | Расчет итогового риска неправильной посадки | AI / CV |
| Must | Dashboard | Отображение камеры, keypoints, риска и метрик | Frontend |
| Must | Baseline calibration | Сохранение нормальной посадки пользователя | Integration / AI |
| Must | Buildable MVP | Проект запускается через `npm install`, `npm run dev`, `npm run build` | Integration |
| Should | История сессий | LocalStorage с краткими результатами | Integration |
| Should | График | Визуализация изменения risk score во времени | Frontend |
| Should | Сглаживание | EMA-сглаживание keypoints и метрик для стабильности | AI / CV |
| Should | Eval-set | Минимум 20 тестовых сценариев | Docs / QA |
| Could | Настройки чувствительности | Sliders для sensitivity, confidence, FPS, smoothing | Frontend / AI |
| Could | JSON export | Экспорт краткого отчета сессии | Integration |
| Won't now | Медицинская диагностика | Проект не ставит диагнозы и не дает медицинских заключений | Все |
| Won't now | Серверное хранение видео | Видео не сохраняется и не отправляется на сервер | Все |
