ACTIVITY_MULTIPLIERS = {
    "sedentary": 1.2,
    "light": 1.375,
    "moderate": 1.55,
    "active": 1.725,
    "very_active": 1.9,
}

MINIMUM_DAILY_CALORIES = 1200
DEFAULT_DEFICIT = 500


def calculate_bmr(weight_kg: float, height_cm: float, age: int, gender: str) -> float:
    if gender == "male":
        return 10 * weight_kg + 6.25 * height_cm - 5 * age + 5
    elif gender == "female":
        return 10 * weight_kg + 6.25 * height_cm - 5 * age - 161
    else:
        male = calculate_bmr(weight_kg, height_cm, age, "male")
        female = calculate_bmr(weight_kg, height_cm, age, "female")
        return (male + female) / 2


def calculate_tdee(bmr: float, activity_level: str) -> float:
    return bmr * ACTIVITY_MULTIPLIERS[activity_level]


def calculate_daily_target(
    weight_kg: float, height_cm: float, age: int, gender: str,
    activity_level: str, target_weight_kg: float,
) -> int:
    bmr = calculate_bmr(weight_kg, height_cm, age, gender)
    tdee = calculate_tdee(bmr, activity_level)
    target = int(tdee - DEFAULT_DEFICIT)
    return max(target, MINIMUM_DAILY_CALORIES)
