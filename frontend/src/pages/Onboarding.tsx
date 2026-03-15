import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { apiFetch } from "../lib/api";

const ACTIVITY_LEVELS = [
  { value: "sedentary", label: "Sedentary (office job, little exercise)" },
  { value: "light", label: "Light (exercise 1-3 days/week)" },
  { value: "moderate", label: "Moderate (exercise 3-5 days/week)" },
  { value: "active", label: "Active (exercise 6-7 days/week)" },
  { value: "very_active", label: "Very Active (physical job + exercise)" },
];

type Step = "gender" | "age" | "height" | "weight" | "activity" | "target" | "review" | "apikey";

export function Onboarding() {
  const navigate = useNavigate();
  const [step, setStep] = useState<Step>("gender");
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);

  const [gender, setGender] = useState("");
  const [age, setAge] = useState("");
  const [heightCm, setHeightCm] = useState("");
  const [weightKg, setWeightKg] = useState("");
  const [activityLevel, setActivityLevel] = useState("");
  const [targetWeightKg, setTargetWeightKg] = useState("");
  const [calorieTarget, setCalorieTarget] = useState<number | null>(null);
  const [calorieOverride, setCalorieOverride] = useState("");
  const [apiKey, setApiKey] = useState("");

  const calculatePreview = () => {
    const w = parseFloat(weightKg);
    const h = parseFloat(heightCm);
    const a = parseInt(age);
    const multipliers: Record<string, number> = {
      sedentary: 1.2, light: 1.375, moderate: 1.55, active: 1.725, very_active: 1.9,
    };

    let bmr: number;
    if (gender === "male") bmr = 10 * w + 6.25 * h - 5 * a + 5;
    else if (gender === "female") bmr = 10 * w + 6.25 * h - 5 * a - 161;
    else bmr = ((10 * w + 6.25 * h - 5 * a + 5) + (10 * w + 6.25 * h - 5 * a - 161)) / 2;

    const tdee = bmr * (multipliers[activityLevel] || 1.2);
    const target = Math.max(1200, Math.round(tdee - 500));
    setCalorieTarget(target);
    setCalorieOverride(String(target));
  };

  const handleSubmit = async () => {
    setLoading(true);
    setError("");

    const res = await apiFetch("/onboarding", {
      method: "POST",
      body: JSON.stringify({
        age: parseInt(age),
        gender,
        height_cm: parseFloat(heightCm),
        weight_kg: parseFloat(weightKg),
        activity_level: activityLevel,
        target_weight_kg: parseFloat(targetWeightKg),
        daily_calorie_target: parseInt(calorieOverride),
        timezone: Intl.DateTimeFormat().resolvedOptions().timeZone,
        openai_api_key: apiKey,
      }),
    });

    if (!res.ok) {
      const data = await res.json();
      setError(data.detail || "Something went wrong");
      setLoading(false);
      return;
    }

    navigate("/");
  };

  const steps: Record<Step, { title: string; next: Step | null; prev: Step | null }> = {
    gender: { title: "What's your gender?", next: "age", prev: null },
    age: { title: "How old are you?", next: "height", prev: "gender" },
    height: { title: "What's your height?", next: "weight", prev: "age" },
    weight: { title: "What's your current weight?", next: "activity", prev: "height" },
    activity: { title: "What's your activity level?", next: "target", prev: "weight" },
    target: { title: "What's your target weight?", next: "review", prev: "activity" },
    review: { title: "Your daily calorie target", next: "apikey", prev: "target" },
    apikey: { title: "Connect OpenAI", next: null, prev: "review" },
  };

  const goNext = () => {
    const next = steps[step].next;
    if (next === "review") calculatePreview();
    if (next) setStep(next);
  };

  const goPrev = () => {
    const prev = steps[step].prev;
    if (prev) setStep(prev);
  };

  const canProceed = (): boolean => {
    switch (step) {
      case "gender": return !!gender;
      case "age": return !!age && parseInt(age) > 0;
      case "height": return !!heightCm && parseFloat(heightCm) > 0;
      case "weight": return !!weightKg && parseFloat(weightKg) > 0;
      case "activity": return !!activityLevel;
      case "target": return !!targetWeightKg && parseFloat(targetWeightKg) < parseFloat(weightKg);
      case "review": return !!calorieOverride && parseInt(calorieOverride) >= 1200;
      case "apikey": return apiKey.startsWith("sk-");
      default: return false;
    }
  };

  return (
    <div className="flex min-h-screen items-center justify-center px-4 bg-gray-50">
      <div className="w-full max-w-sm space-y-6">
        <h1 className="text-xl font-bold text-gray-900 text-center">
          {steps[step].title}
        </h1>

        {error && (
          <div className="bg-red-50 text-red-600 text-sm p-3 rounded-lg">{error}</div>
        )}

        <div className="space-y-4">
          {step === "gender" && (
            <div className="flex gap-3">
              {["male", "female", "other"].map((g) => (
                <button
                  key={g}
                  onClick={() => setGender(g)}
                  className={`flex-1 py-3 rounded-lg border font-medium capitalize ${
                    gender === g
                      ? "bg-green-600 text-white border-green-600"
                      : "bg-white text-gray-700 border-gray-300"
                  }`}
                >
                  {g}
                </button>
              ))}
            </div>
          )}

          {step === "age" && (
            <input type="number" placeholder="Age in years" value={age}
              onChange={(e) => setAge(e.target.value)}
              className="w-full px-4 py-3 rounded-lg border border-gray-300 focus:ring-2 focus:ring-green-500 outline-none" />
          )}

          {step === "height" && (
            <input type="number" placeholder="Height in cm" value={heightCm}
              onChange={(e) => setHeightCm(e.target.value)}
              className="w-full px-4 py-3 rounded-lg border border-gray-300 focus:ring-2 focus:ring-green-500 outline-none" />
          )}

          {step === "weight" && (
            <input type="number" step="0.1" placeholder="Weight in kg" value={weightKg}
              onChange={(e) => setWeightKg(e.target.value)}
              className="w-full px-4 py-3 rounded-lg border border-gray-300 focus:ring-2 focus:ring-green-500 outline-none" />
          )}

          {step === "activity" && (
            <div className="space-y-2">
              {ACTIVITY_LEVELS.map((level) => (
                <button key={level.value} onClick={() => setActivityLevel(level.value)}
                  className={`w-full text-left px-4 py-3 rounded-lg border ${
                    activityLevel === level.value
                      ? "bg-green-600 text-white border-green-600"
                      : "bg-white text-gray-700 border-gray-300"
                  }`}>
                  {level.label}
                </button>
              ))}
            </div>
          )}

          {step === "target" && (
            <div>
              <input type="number" step="0.1" placeholder="Target weight in kg" value={targetWeightKg}
                onChange={(e) => setTargetWeightKg(e.target.value)}
                className="w-full px-4 py-3 rounded-lg border border-gray-300 focus:ring-2 focus:ring-green-500 outline-none" />
              {targetWeightKg && parseFloat(targetWeightKg) >= parseFloat(weightKg) && (
                <p className="text-red-500 text-sm mt-2">
                  Target must be less than current weight ({weightKg} kg)
                </p>
              )}
            </div>
          )}

          {step === "review" && calorieTarget && (
            <div className="space-y-4">
              <div className="bg-green-50 p-4 rounded-lg text-center">
                <p className="text-sm text-gray-600">Recommended daily intake</p>
                <p className="text-3xl font-bold text-green-700">{calorieTarget} kcal</p>
              </div>
              <div>
                <label className="text-sm text-gray-600">Override (min 1200 kcal):</label>
                <input type="number" value={calorieOverride}
                  onChange={(e) => setCalorieOverride(e.target.value)} min={1200}
                  className="w-full px-4 py-3 rounded-lg border border-gray-300 focus:ring-2 focus:ring-green-500 outline-none mt-1" />
              </div>
            </div>
          )}

          {step === "apikey" && (
            <div className="space-y-3">
              <input type="password" placeholder="sk-..." value={apiKey}
                onChange={(e) => setApiKey(e.target.value)}
                className="w-full px-4 py-3 rounded-lg border border-gray-300 focus:ring-2 focus:ring-green-500 outline-none font-mono text-sm" />
              <p className="text-xs text-gray-500">
                Your API key is encrypted and stored securely. It's only used to
                make calls to OpenAI on your behalf.
              </p>
            </div>
          )}
        </div>

        <div className="flex gap-3">
          {steps[step].prev && (
            <button onClick={goPrev}
              className="flex-1 py-3 border border-gray-300 rounded-lg text-gray-700 font-medium">
              Back
            </button>
          )}
          {steps[step].next ? (
            <button onClick={goNext} disabled={!canProceed()}
              className="flex-1 py-3 bg-green-600 text-white rounded-lg font-medium hover:bg-green-700 disabled:opacity-50">
              Next
            </button>
          ) : (
            <button onClick={handleSubmit} disabled={!canProceed() || loading}
              className="flex-1 py-3 bg-green-600 text-white rounded-lg font-medium hover:bg-green-700 disabled:opacity-50">
              {loading ? "Setting up..." : "Start Tracking"}
            </button>
          )}
        </div>
      </div>
    </div>
  );
}
