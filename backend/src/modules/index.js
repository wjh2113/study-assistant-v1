/**
 * Modules Index - 模块统一导出
 * AI 核心功能模块
 */

// AI Gateway (ISSUE-P0-003)
const AiGatewayService = require('./ai-gateway/AiGatewayService');
const AiGatewayController = require('./ai-gateway/AiGatewayController');
const AiTaskLogModel = require('./ai-gateway/AiTaskLogModel');

// Textbook Parser (ISSUE-P1-002)
const TextbookParserService = require('./textbook-parser/TextbookParserService');
const TextbookParserWorker = require('./textbook-parser/TextbookParserWorker');
const TextbookModel = require('./textbook-parser/TextbookModel');

// Weakness Analysis (ISSUE-P1-003)
const KnowledgeMasteryModel = require('./weakness-analysis/KnowledgeMasteryModel');
const WeaknessAnalysisService = require('./weakness-analysis/WeaknessAnalysisService');

// Points System (ISSUE-P1-004)
const PointsSystemModel = require('./points-system/PointsSystemModel');
const PointsSystemController = require('./points-system/PointsSystemController');

// Leaderboard (ISSUE-P1-005)
const LeaderboardModel = require('./leaderboard/LeaderboardModel');
const LeaderboardController = require('./leaderboard/LeaderboardController');

// Rate Limiter (ISSUE-P1-007)
const {
  globalLimiter,
  strictLimiter,
  sendCodeLimiter,
  aiGenerateLimiter,
  textbookParseLimiter
} = require('./rate-limiter/RateLimiterConfig');

// Logger (ISSUE-P1-008)
const {
  logger,
  AuditLogger,
  requestLogger,
  errorLogger
} = require('./logger/WinstonLoggerService');

module.exports = {
  // AI Gateway
  AiGatewayService,
  AiGatewayController,
  AiTaskLogModel,

  // Textbook Parser
  TextbookParserService,
  TextbookParserWorker,
  TextbookModel,

  // Weakness Analysis
  KnowledgeMasteryModel,
  WeaknessAnalysisService,

  // Points System
  PointsSystemModel,
  PointsSystemController,

  // Leaderboard
  LeaderboardModel,
  LeaderboardController,

  // Rate Limiter
  globalLimiter,
  strictLimiter,
  sendCodeLimiter,
  aiGenerateLimiter,
  textbookParseLimiter,

  // Logger
  logger,
  AuditLogger,
  requestLogger,
  errorLogger
};
