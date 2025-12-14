import { GoogleGenAI } from "@google/genai";
import { Deal, SalesRep } from '../types';

const getClient = () => {
  const apiKey = process.env.API_KEY;
  if (!apiKey) {
    console.warn("API_KEY not found in environment variables");
    return null;
  }
  return new GoogleGenAI({ apiKey });
};

export const analyzePipeline = async (deals: Deal[], reps: SalesRep[]): Promise<string> => {
  const ai = getClient();
  if (!ai) return "API Key unavailable. Cannot generate insights.";

  const activeDeals = deals.filter(d => d.stage !== 'Closed Won' && d.stage !== 'Closed Lost');
  const totalPipeline = activeDeals.reduce((sum, d) => sum + d.value, 0);

  // Helper for context
  const toCr = (val: number) => (val / 10000000).toFixed(2) + " Cr";

  const contextData = {
    totalPipelineValue: toCr(totalPipeline),
    dealCount: activeDeals.length,
    highValueDeals: activeDeals.filter(d => d.value > 5000000).map(d => ({ client: d.customerName, val: toCr(d.value), stage: d.stage })),
    stuckDeals: activeDeals.filter(d => d.probability < 30 && d.value > 2000000),
    reps: reps.map(r => r.name)
  };

  const prompt = `
    You are a senior Sales Operations Analyst for an Indian Tech Sales team. Analyze this sales pipeline data snapshot:
    ${JSON.stringify(contextData, null, 2)}

    Provide a concise executive summary with:
    1. Overall health assessment (bullish/bearish).
    2. Top 2 specific risks (e.g., stuck high-value deals).
    3. One actionable recommendation for the sales manager to increase velocity.

    Keep it professional, encouraging, and under 150 words. Format with simple markdown.
  `;

  try {
    const response = await ai.models.generateContent({
      model: 'gemini-2.5-flash',
      contents: prompt,
    });
    return response.text || "No analysis generated.";
  } catch (error) {
    console.error("Gemini API Error:", error);
    return "Unable to generate insights at this time. Please try again later.";
  }
};

export const suggestNextStep = async (deal: Deal): Promise<string> => {
    const ai = getClient();
    if (!ai) return "API Key unavailable.";

    const prompt = `
      Given this sales deal in an Indian context (Values in INR):
      Customer: ${deal.customerName}
      Stage: ${deal.stage}
      Value: ${deal.value} INR
      Probability: ${deal.probability}%

      Suggest one concrete "Next Best Action" for the sales rep to move this forward. Keep it one short sentence.
    `;

    try {
      const response = await ai.models.generateContent({
        model: 'gemini-2.5-flash',
        contents: prompt,
      });
      return response.text || "Review deal terms.";
    } catch (error) {
      return "Contact customer for update.";
    }
};