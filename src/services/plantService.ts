import { GoogleGenAI, Type } from "@google/genai";
import { PlantInfo } from "../components/PlantDetails";

let aiInstance: GoogleGenAI | null = null;

const getAI = () => {
  if (!aiInstance) {
    const apiKey = import.meta.env.VITE_GEMINI_API_KEY;
    
    if (!apiKey) {
      throw new Error("Gemini API key topilmadi. Vercel Settings > Environment Variables qismiga 'VITE_GEMINI_API_KEY' qo'shilganligini va loyiha qayta deploy qilinganligini tekshiring.");
    }
    aiInstance = new GoogleGenAI({ apiKey });
  }
  return aiInstance;
};

const PLANT_SCHEMA = {
  type: Type.OBJECT,
  properties: {
    isPlant: { type: Type.BOOLEAN, description: "Is this actually a plant? Set false if it is a human, object, or anything else." },
    name: { type: Type.STRING, description: "O'simlikning nomi" },
    scientificName: { type: Type.STRING, description: "Lotincha nomi" },
    species: { type: Type.STRING, description: "O'simlik turi" },
    variety: { type: Type.STRING, description: "O'simlikning aniq navi yoki varianti" },
    description: { type: Type.STRING, description: "Batafsil tavsifi" },
    benefits: { 
      type: Type.ARRAY, 
      items: { type: Type.STRING },
      description: "Ekologik yoki shifobaxsh 3ta foydasi"
    },
    careTips: { 
      type: Type.ARRAY, 
      items: { type: Type.STRING },
      description: "O'stirish bo'yicha 3-4ta maslahat"
    },
    deathCauses: {
      type: Type.ARRAY,
      items: { type: Type.STRING },
      description: "O'simlikning qurib qolishi yoki o'lishiga sabab bo'luvchi 3-4 ta asosiy omillar"
    },
    toxicity: { type: Type.STRING, description: "Zaharlilik haqida qisqa ma'lumot" },
    safetyWarning: { type: Type.STRING, description: "ENG MUHIM: Zaharli yoki zaharsizligi haqida katta ogohlantirish matni" },
    waterNeeds: { type: Type.STRING, description: "Suv ehtiyoji - ODDIY TILDA (masalan: haftada 2 marta suv quying, tuproq qurisa quying)" },
    sunlightNeeds: { type: Type.STRING, description: "Quyosh ehtiyoji - ODDIY TILDA (masalan: to'g'ridan-to'g'ri quyosh tushmasin, soya joyda saqlang)" },
    dangerPercentage: { type: Type.INTEGER, description: "Inson uchun xavflilik darajasi (0-100)" },
    growthMetrics: {
      type: Type.OBJECT,
      properties: {
        humidity: { type: Type.STRING, description: "Namlik haqida oddiy tushuntirish (masalan: har kuni bargiga suv seping)" },
        temperature: { type: Type.STRING, description: "Harorat haqida oddiy tushuntirish (masalan: issiq xonada tursin)" },
        soilQuality: { type: Type.STRING, description: "Tuproq haqida oddiy tushuntirish (masalan: yumshoq, qumli tuproq bo'lsin)" },
        resilience: { type: Type.STRING, description: "Chidamlilik haqida oddiy tushuntirish (masalan: sovuqqa juda chidamli)" }
      },
      required: ["humidity", "temperature", "soilQuality", "resilience"]
    },
    simpleCareGuide: { type: Type.STRING, description: "Eng muhim parvarish qoidasi (1 ta gapda)" },
    yieldTimeline: { type: Type.STRING, description: "Qachon hosil berishi yoki gullashi haqida taxminiy vaqt" },
    fertilizerNeeds: { type: Type.STRING, description: "Og'it berish tartibi haqida oddiy tushuntirish" },
    soilTypeDetails: { type: Type.STRING, description: "Qanday tuproq yoqishi haqida oddiy ma'lumot" },
    rarity: { type: Type.STRING, description: "Hozirda tabiatda qanchalik kamyobligi haqida qisqa ma'lumot" },
    isRedBook: { type: Type.BOOLEAN, description: "Qizil kitobga kiritilganmi?" }
  },
  required: ["isPlant", "name", "scientificName", "species", "variety", "description", "benefits", "careTips", "deathCauses", "toxicity", "safetyWarning", "waterNeeds", "sunlightNeeds", "dangerPercentage", "growthMetrics", "simpleCareGuide", "yieldTimeline", "fertilizerNeeds", "soilTypeDetails", "rarity", "isRedBook"]
};

export const identifyPlantByImage = async (base64Image: string): Promise<PlantInfo> => {
  const ai = getAI();
  const imagePart = {
    inlineData: {
      mimeType: "image/jpeg",
      data: base64Image.split(",")[1],
    },
  };

  const promptPart = {
    text: "Ushbu tasvirni tahlil qiling. AGAR TASVIRDA O'SIMLIK BO'LMASA (masalan, odam, mashina, hayvon yoki boshqa narsa bo'lsa), yoki tasvir juda noaniq bo'lib, unga mos keladigan HAQIQIY o'simlik turi topilmasa, isPlant ni false qilib belgilang. FAQAT HAQIQIY va ANIQ turlarni aniqlang. Agar o'simlik bo'lsa, haqiqiy botanika ma'lumotlarini bering. Qizil kitob holati va xavfliligiga (zaharliligiga) alohida e'tibor bering. JAVOB FAQAT O'ZBEK TILIDA BO'LSIN.",
  };

  const response = await ai.models.generateContent({
    model: "gemini-2.0-flash",
    contents: [{ role: 'user', parts: [imagePart, promptPart] }],
    config: {
      responseMimeType: "application/json",
      responseSchema: PLANT_SCHEMA,
    },
  });

  const parsed = JSON.parse(response.text || "{}");
  if (!parsed.isPlant) {
    throw new Error("Bunday tur hali kashf etilmagan yoki rasmda o'simlik aniqlanmadi.");
  }
  return parsed as PlantInfo;
};

export const identifyPlantByText = async (input: string): Promise<PlantInfo> => {
  const ai = getAI();
  const promptPart = {
    text: `Aniqlash: "${input}". 
    Agar nom bo'lsa, o'shani tahlil qiling. Agar tavsif bo'lsa, mos keladigan eng yaqin o'simlikni toping.
    Javob faqat o'zbek tilida, tushunarli, ilmiy terminlarsiz (oddiy qishloq xalqi tushunadigan tilda) bo'lsin.
    Hosil vaqti, parvarish usuli, og'itlash haqida batafsil va sodda yozing.
    Agar o'simlik bo'lmasa, isPlant: false qaytaring.`,
  };

  const response = await ai.models.generateContent({
    model: "gemini-2.0-flash",
    contents: [{ role: 'user', parts: [promptPart] }],
    config: {
      responseMimeType: "application/json",
      responseSchema: PLANT_SCHEMA,
    },
  });

  const parsed = JSON.parse(response.text || "{}");
  if (!parsed.isPlant) {
    throw new Error("Bunday o'simlik aniqlanmadi. Iltimos, nomini yoki tavsifini tekshirib qaytadan yozing.");
  }
  return parsed as PlantInfo;
};

export const getDetailedCareGuide = async (plantName: string): Promise<string> => {
  const ai = getAI();
  const response = await ai.models.generateContent({
    model: "gemini-2.0-flash",
    contents: [{ role: 'user', parts: [{ text: `Botanik mutaxassis sifatida "${plantName}" o'simligini muvaffaqiyatli o'stirish sirlarini ayting. 
    Oddiy qishloq xalqi tushunadigan tilda, eng muhim va hal qiluvchi amallarni yozing. 
    Masalan: qachon og'it berish kerak, qaysi paytda suv quyish o'ldiradi, qanday qilib hosilni ko'paytirish mumkin. 
    Faqat eng kerakli va amaliy narsalarni ayting. Kerak bo'lsa ko'p o'ylab, eng yaxshi maslahatlarni bering.` }] }],
  });
  return response.text || "Ma'lumot topilmadi.";
};

