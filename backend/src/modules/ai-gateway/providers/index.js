/**
 * AI Providers Index - 所有 AI 服务商统一导出
 * Phase 2: 集成百度文心、讯飞星火
 */

const BaiduWenxinProvider = require('./BaiduWenxinProvider');
const IFlytekSparkProvider = require('./IFlytekSparkProvider');

module.exports = {
  BaiduWenxinProvider,
  IFlytekSparkProvider,
  // 原生 providers 在 AiGatewayServiceV2 中直接处理
  // 包括：aliyun, openai, azure, moonshot
};
