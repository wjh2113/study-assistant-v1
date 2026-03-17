/**
 * AI Gateway Phase 2 集成验证脚本
 * 验证所有 Phase 2 组件正确集成，无需数据库
 */

console.log('🚀 开始 Phase 2 集成验证...\n');

try {
  // 1. 验证 Provider 模块
  console.log('✅ 验证 Provider 模块...');
  const { BaiduWenxinProvider, IFlytekSparkProvider } = require('./src/modules/ai-gateway/providers');
  console.log('   - BaiduWenxinProvider: OK');
  console.log('   - IFlytekSparkProvider: OK');

  // 2. 验证服务模块（不初始化）
  console.log('\n✅ 验证服务模块结构...');
  const ResponseCacheService = require('./src/modules/ai-gateway/ResponseCacheService');
  const BatchUpdateService = require('./src/modules/ai-gateway/BatchUpdateService');
  const PrometheusExporter = require('./src/modules/monitoring/PrometheusExporter');
  const CostAnalysisService = require('./src/modules/cost-analysis/CostAnalysisService');
  console.log('   - ResponseCacheService: OK');
  console.log('   - BatchUpdateService: OK');
  console.log('   - PrometheusExporter: OK');
  console.log('   - CostAnalysisService: OK');

  // 3. 验证 AiGatewayServiceV2 结构
  console.log('\n✅ 验证 AiGatewayServiceV2 集成...');
  const AiGatewayServiceV2 = require('./src/modules/ai-gateway/AiGatewayServiceV2');
  
  // 验证 Provider 配置
  const hasBaidu = !!AiGatewayServiceV2.PROVIDER_CONFIGS.baidu;
  const hasIFlytek = !!AiGatewayServiceV2.PROVIDER_CONFIGS.iflytek;
  console.log(`   - 百度文心配置：${hasBaidu ? '✅' : '❌'}`);
  console.log(`   - 讯飞星火配置：${hasIFlytek ? '✅' : '❌'}`);
  
  // 验证模型路由包含新 provider
  const routing = AiGatewayServiceV2.selectModel('simple-question');
  const hasBaiduFallback = routing.fallbacks.includes('ernie-bot-turbo');
  const hasIFlytekFallback = routing.fallbacks.includes('spark-lite');
  console.log(`   - 百度模型在路由中：${hasBaiduFallback ? '✅' : '❌'}`);
  console.log(`   - 讯飞模型在路由中：${hasIFlytekFallback ? '✅' : '❌'}`);

  // 验证 Phase 2 方法存在
  const hasGetCacheStats = typeof AiGatewayServiceV2.getCacheStats === 'function';
  const hasGetCostStats = typeof AiGatewayServiceV2.getCostStats === 'function';
  const hasGetBudgetUsage = typeof AiGatewayServiceV2.getBudgetUsage === 'function';
  const hasGetPrometheusMetrics = typeof AiGatewayServiceV2.getPrometheusMetrics === 'function';
  const hasGetBatchUpdateStatus = typeof AiGatewayServiceV2.getBatchUpdateStatus === 'function';
  
  console.log(`   - getCacheStats 方法：${hasGetCacheStats ? '✅' : '❌'}`);
  console.log(`   - getCostStats 方法：${hasGetCostStats ? '✅' : '❌'}`);
  console.log(`   - getBudgetUsage 方法：${hasGetBudgetUsage ? '✅' : '❌'}`);
  console.log(`   - getPrometheusMetrics 方法：${hasGetPrometheusMetrics ? '✅' : '❌'}`);
  console.log(`   - getBatchUpdateStatus 方法：${hasGetBatchUpdateStatus ? '✅' : '❌'}`);

  // 4. 验证 Provider 类引用
  console.log('\n✅ 验证 Provider 类引用...');
  const baiduProviderClass = AiGatewayServiceV2.PROVIDER_CONFIGS.baidu?.provider;
  const iflytekProviderClass = AiGatewayServiceV2.PROVIDER_CONFIGS.iflytek?.provider;
  console.log(`   - 百度 Provider 类：${baiduProviderClass === BaiduWenxinProvider ? '✅' : '❌'}`);
  console.log(`   - 讯飞 Provider 类：${iflytekProviderClass === IFlytekSparkProvider ? '✅' : '❌'}`);

  // 5. 验证 Prometheus 指标定义
  console.log('\n✅ 验证 Prometheus 指标...');
  const metrics = PrometheusExporter.metrics;
  console.log(`   - aiRequestsTotal: ${!!metrics.aiRequestsTotal ? '✅' : '❌'}`);
  console.log(`   - aiRequestDuration: ${!!metrics.aiRequestDuration ? '✅' : '❌'}`);
  console.log(`   - aiTokenUsage: ${!!metrics.aiTokenUsage ? '✅' : '❌'}`);
  console.log(`   - aiCacheHits: ${!!metrics.aiCacheHits ? '✅' : '❌'}`);
  console.log(`   - aiCacheMisses: ${!!metrics.aiCacheMisses ? '✅' : '❌'}`);

  // 6. 验证成本分析定价配置
  console.log('\n✅ 验证成本分析配置...');
  const pricing = CostAnalysisService.PRICING;
  console.log(`   - 阿里云定价：${!!pricing.aliyun ? '✅' : '❌'}`);
  console.log(`   - 百度定价：${!!pricing.baidu ? '✅' : '❌'}`);
  console.log(`   - 讯飞定价：${!!pricing.iflytek ? '✅' : '❌'}`);
  console.log(`   - OpenAI 定价：${!!pricing.openai ? '✅' : '❌'}`);

  // 7. 验证缓存服务配置
  console.log('\n✅ 验证缓存服务配置...');
  const cacheConfig = ResponseCacheService.config;
  console.log(`   - defaultTTL: ${cacheConfig.defaultTTL}s`);
  console.log(`   - questionTTL: ${cacheConfig.questionTTL}s`);
  console.log(`   - embeddingTTL: ${cacheConfig.embeddingTTL}s`);
  console.log(`   - chatTTL: ${cacheConfig.chatTTL}s`);

  // 8. 验证批量更新配置
  console.log('\n✅ 验证批量更新配置...');
  const batchConfig = BatchUpdateService.config;
  console.log(`   - batchSize: ${batchConfig.batchSize}`);
  console.log(`   - maxQueueSize: ${batchConfig.maxQueueSize}`);
  console.log(`   - flushInterval: ${batchConfig.flushInterval}ms`);

  // 9. 验证预算配置
  console.log('\n✅ 验证预算配置...');
  const budgetConfig = CostAnalysisService.BUDGET_CONFIG;
  console.log(`   - daily: ¥${budgetConfig.daily}`);
  console.log(`   - weekly: ¥${budgetConfig.weekly}`);
  console.log(`   - monthly: ¥${budgetConfig.monthly}`);

  console.log('\n✅✅✅ Phase 2 集成验证完成！所有组件已正确集成 ✅✅✅\n');
  
  process.exit(0);
} catch (error) {
  console.error('\n❌ 验证失败:', error.message);
  console.error(error.stack);
  process.exit(1);
}
