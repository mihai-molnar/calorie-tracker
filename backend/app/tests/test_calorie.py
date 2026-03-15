from app.services.calorie import calculate_bmr, calculate_tdee, calculate_daily_target


def test_bmr_male():
    bmr = calculate_bmr(weight_kg=80, height_cm=180, age=30, gender="male")
    assert bmr == 1780


def test_bmr_female():
    bmr = calculate_bmr(weight_kg=65, height_cm=165, age=25, gender="female")
    assert bmr == 1395.25


def test_bmr_other_averages_male_female():
    bmr = calculate_bmr(weight_kg=80, height_cm=180, age=30, gender="other")
    male_bmr = calculate_bmr(weight_kg=80, height_cm=180, age=30, gender="male")
    female_bmr = calculate_bmr(weight_kg=80, height_cm=180, age=30, gender="female")
    assert bmr == (male_bmr + female_bmr) / 2


def test_tdee_moderate():
    bmr = 1780
    tdee = calculate_tdee(bmr, activity_level="moderate")
    assert tdee == bmr * 1.55


def test_daily_target_with_deficit():
    target = calculate_daily_target(
        weight_kg=90, height_cm=180, age=30, gender="male",
        activity_level="moderate", target_weight_kg=80
    )
    bmr = 1880  # 10*90+6.25*180-5*30+5
    expected_tdee = 1880 * 1.55
    expected = int(expected_tdee - 500)
    assert target == expected


def test_daily_target_floor_1200():
    target = calculate_daily_target(
        weight_kg=45, height_cm=150, age=60, gender="female",
        activity_level="sedentary", target_weight_kg=40
    )
    assert target == 1200
