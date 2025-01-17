export interface TableData {
  domain: string;
  niche1: string;
  niche2: string;
  traffic: number;
  dr: number;
  da: number;
  language: string;
  price: number;
  spamScore: number;
}

export interface FilterParams {
  domain?: string;
  niche1?: string;
  niche2?: string;
  language?: string;
  trafficMin?: number;
  trafficMax?: number;
  drMin?: number;
  drMax?: number;
  daMin?: number;
  daMax?: number;
  priceMin?: number;
  priceMax?: number;
  spamScoreMin?: number;
  spamScoreMax?: number;
}