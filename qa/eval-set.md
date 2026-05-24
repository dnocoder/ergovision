# ErgoVision eval-set plan

Минимальный eval-set для защиты: 20 сценариев, по 4 примера на каждый класс.

| ID | Класс | Описание | Ожидаемый результат |
|---|---|---|---|
| normal-01 | Normal | Пользователь сидит ровно перед камерой | Low risk |
| normal-02 | Normal | Ровная посадка после калибровки | Low risk |
| normal-03 | Normal | Небольшое естественное движение | Low risk |
| normal-04 | Normal | Ровная посадка при обычном освещении | Low risk |
| head-tilt-01 | Head tilt | Голова наклонена влево | Medium/High risk |
| head-tilt-02 | Head tilt | Голова наклонена вправо | Medium/High risk |
| head-tilt-03 | Head tilt | Наклон удерживается несколько секунд | Medium/High risk |
| head-tilt-04 | Head tilt | Наклон после нормальной калибровки | Medium/High risk |
| head-forward-01 | Head forward | Пользователь тянется к экрану | Medium/High risk |
| head-forward-02 | Head forward | Лицо заметно ближе к камере | Medium/High risk |
| head-forward-03 | Head forward | Переход из normal в forward | Medium/High risk |
| head-forward-04 | Head forward | Долгое близкое положение | Medium/High risk |
| shoulder-tilt-01 | Shoulder tilt | Левое плечо выше правого | Medium/High risk |
| shoulder-tilt-02 | Shoulder tilt | Правое плечо выше левого | Medium/High risk |
| shoulder-tilt-03 | Shoulder tilt | Перекос плеч после калибровки | Medium/High risk |
| shoulder-tilt-04 | Shoulder tilt | Слабый, но устойчивый перекос | Medium risk |
| too-close-01 | Too close | Пользователь слишком близко к камере | Medium/High risk |
| too-close-02 | Too close | Камера видит только верх тела крупно | Medium/High risk |
| too-close-03 | Too close | Резкое приближение к камере | Medium/High risk |
| too-close-04 | Too close | Долгое слишком близкое положение | Medium/High risk |

Для каждого сценария фиксируются:

- ожидаемый класс;
- фактический `riskScore`;
- уровень риска;
- замечания по видимости keypoints;
- latency, если измеряется вручную.
