import * as fs from 'fs';
import * as path from 'path';

/**
 * 测试覆盖率报告生成器
 * 分析 Jest 覆盖率输出并生成详细报告
 */

interface CoverageReport {
  total: {
    files: number;
    tests: number;
    pass: number;
    fail: number;
    skip: number;
    coverage: number;
  };
  models: {
    [modelName: string]: {
      tests: number;
      coverage: number;
      lines: number;
      branches: number;
      functions: number;
      statements: number;
    };
  };
  summary: {
    status: 'PASS' | 'FAIL' | 'WARNING';
    message: string;
    recommendations: string[];
  };
}

/**
 * 生成测试覆盖率报告
 */
export function generateCoverageReport(coverageDir: string = './coverage'): CoverageReport {
  const report: CoverageReport = {
    total: {
      files: 0,
      tests: 0,
      pass: 0,
      fail: 0,
      skip: 0,
      coverage: 0,
    },
    models: {},
    summary: {
      status: 'PASS',
      message: '',
      recommendations: [],
    },
  };

  try {
    // 读取 coverage-final.json
    const coverageFile = path.join(coverageDir, 'coverage-final.json');
    if (!fs.existsSync(coverageFile)) {
      throw new Error('Coverage file not found. Run tests with --coverage first.');
    }

    const coverageData = JSON.parse(fs.readFileSync(coverageFile, 'utf-8'));

    // 分析每个文件的覆盖率
    Object.keys(coverageData).forEach((filePath) => {
      const fileData = coverageData[filePath];
      const fileName = path.basename(filePath);

      if (fileName.includes('.model.spec.ts') || fileName.includes('model')) {
        const modelName = fileName.replace('.model.spec.ts', '').replace('.spec.ts', '');
        
        const lines = fileData.s ? Object.keys(fileData.s).length : 0;
        const branches = fileData.b ? Object.keys(fileData.b).length : 0;
        const functions = fileData.f ? Object.keys(fileData.f).length : 0;
        const statements = fileData.s ? Object.values(fileData.s).reduce((a: number, b: number) => a + b, 0) : 0;
        
        const lineCoverage = fileData.s ? 
          (Object.values(fileData.s).filter((v: number) => v > 0).length / lines) * 100 : 0;

        report.models[modelName] = {
          tests: 0, // Will be updated from test results
          coverage: Math.round(lineCoverage * 100) / 100,
          lines,
          branches,
          functions,
          statements,
        };
      }

      report.total.files++;
    });

    // 计算总体覆盖率
    const allCoverages = Object.values(report.models).map(m => m.coverage);
    if (allCoverages.length > 0) {
      report.total.coverage = Math.round(
        (allCoverages.reduce((a, b) => a + b, 0) / allCoverages.length) * 100
      ) / 100;
    }

    // 生成总结
    generateSummary(report);

  } catch (error) {
    report.summary.status = 'FAIL';
    report.summary.message = `Error generating report: ${error}`;
  }

  return report;
}

/**
 * 生成总结和建议
 */
function generateSummary(report: CoverageReport) {
  const { total, models } = report;

  // 计算模型数量
  const modelCount = Object.keys(models).length;

  // 检查覆盖率是否达到 100%
  const perfectCoverage = Object.values(models).every(m => m.coverage >= 100);
  const highCoverage = Object.values(models).every(m => m.coverage >= 80);

  if (perfectCoverage) {
    report.summary.status = 'PASS';
    report.summary.message = `🎉 恭喜！所有 ${modelCount} 个模型测试覆盖率达到 100%！`;
  } else if (highCoverage) {
    report.summary.status = 'PASS';
    report.summary.message = `✅ 测试覆盖率良好：${total.coverage}%`;
    report.summary.recommendations.push('继续完善测试，争取达到 100% 覆盖率');
  } else {
    report.summary.status = 'WARNING';
    report.summary.message = `⚠️ 测试覆盖率需要提升：${total.coverage}%`;
    report.summary.recommendations.push('建议为以下模型添加更多测试');
  }

  // 找出覆盖率低的模型
  const lowCoverageModels = Object.entries(models)
    .filter(([_, data]) => data.coverage < 80)
    .sort((a, b) => a[1].coverage - b[1].coverage);

  if (lowCoverageModels.length > 0) {
    report.summary.recommendations.push('\n需要重点关注的模型:');
    lowCoverageModels.forEach(([name, data]) => {
      report.summary.recommendations.push(
        `  - ${name}: ${data.coverage}% (${data.lines} 行代码)`
      );
    });
  }

  // 添加通用建议
  report.summary.recommendations.push('\n测试建议:');
  report.summary.recommendations.push('  1. 确保所有 CRUD 操作都有测试');
  report.summary.recommendations.push('  2. 添加边界条件测试（null 值、极大值、极小值）');
  report.summary.recommendations.push('  3. 测试所有关联关系（include）');
  report.summary.recommendations.push('  4. 测试唯一约束和验证规则');
  report.summary.recommendations.push('  5. 添加时间戳自动更新测试');
}

/**
 * 生成 HTML 报告
 */
export function generateHtmlReport(report: CoverageReport, outputFile: string = './coverage/report.html'): void {
  const html = `
<!DOCTYPE html>
<html lang="zh-CN">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>测试覆盖率报告 - Models 层</title>
  <style>
    body {
      font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, 'Helvetica Neue', Arial, sans-serif;
      line-height: 1.6;
      color: #333;
      max-width: 1200px;
      margin: 0 auto;
      padding: 20px;
      background: #f5f5f5;
    }
    .container {
      background: white;
      border-radius: 8px;
      padding: 30px;
      box-shadow: 0 2px 10px rgba(0,0,0,0.1);
    }
    h1 {
      color: #2c3e50;
      border-bottom: 3px solid #3498db;
      padding-bottom: 10px;
    }
    h2 {
      color: #34495e;
      margin-top: 30px;
    }
    .summary {
      background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
      color: white;
      padding: 20px;
      border-radius: 8px;
      margin: 20px 0;
    }
    .summary.pass { background: linear-gradient(135deg, #11998e 0%, #38ef7d 100%); }
    .summary.warning { background: linear-gradient(135deg, #f093fb 0%, #f5576c 100%); }
    .summary.fail { background: linear-gradient(135deg, #eb3349 0%, #f45c43 100%); }
    .stats {
      display: grid;
      grid-template-columns: repeat(auto-fit, minmax(200px, 1fr));
      gap: 15px;
      margin: 20px 0;
    }
    .stat-card {
      background: #f8f9fa;
      padding: 15px;
      border-radius: 8px;
      text-align: center;
      border-left: 4px solid #3498db;
    }
    .stat-value {
      font-size: 2em;
      font-weight: bold;
      color: #2c3e50;
    }
    .stat-label {
      color: #7f8c8d;
      font-size: 0.9em;
    }
    table {
      width: 100%;
      border-collapse: collapse;
      margin: 20px 0;
    }
    th, td {
      padding: 12px;
      text-align: left;
      border-bottom: 1px solid #ddd;
    }
    th {
      background: #34495e;
      color: white;
    }
    tr:hover {
      background: #f5f5f5;
    }
    .coverage-bar {
      width: 100%;
      height: 20px;
      background: #ecf0f1;
      border-radius: 10px;
      overflow: hidden;
    }
    .coverage-fill {
      height: 100%;
      background: linear-gradient(90deg, #e74c3c 0%, #f39c12 50%, #2ecc71 100%);
      transition: width 0.3s;
    }
    .recommendations {
      background: #fff3cd;
      border-left: 4px solid #ffc107;
      padding: 15px;
      margin: 20px 0;
      border-radius: 4px;
    }
    .recommendations ul {
      margin: 10px 0;
      padding-left: 20px;
    }
    .recommendations li {
      margin: 5px 0;
    }
    .model-name {
      font-weight: bold;
      color: #2c3e50;
    }
    .high-coverage { color: #27ae60; }
    .medium-coverage { color: #f39c12; }
    .low-coverage { color: #e74c3c; }
  </style>
</head>
<body>
  <div class="container">
    <h1>📊 Models 层测试覆盖率报告</h1>
    
    <div class="summary ${report.summary.status.toLowerCase()}">
      <h2>${report.summary.status === 'PASS' ? '✅' : report.summary.status === 'WARNING' ? '⚠️' : '❌'} ${report.summary.message}</h2>
    </div>

    <div class="stats">
      <div class="stat-card">
        <div class="stat-value">${report.total.coverage}%</div>
        <div class="stat-label">总体覆盖率</div>
      </div>
      <div class="stat-card">
        <div class="stat-value">${Object.keys(report.models).length}</div>
        <div class="stat-label">测试模型数</div>
      </div>
      <div class="stat-card">
        <div class="stat-value">${report.total.files}</div>
        <div class="stat-label">总文件数</div>
      </div>
      <div class="stat-card">
        <div class="stat-value">${report.summary.status}</div>
        <div class="stat-label">状态</div>
      </div>
    </div>

    <h2>📋 模型覆盖率详情</h2>
    <table>
      <thead>
        <tr>
          <th>模型名称</th>
          <th>覆盖率</th>
          <th>代码行数</th>
          <th>分支数</th>
          <th>函数数</th>
          <th>语句数</th>
        </tr>
      </thead>
      <tbody>
        ${Object.entries(report.models).map(([name, data]) => `
          <tr>
            <td class="model-name">${name}</td>
            <td>
              <span class="${data.coverage >= 80 ? 'high-coverage' : data.coverage >= 60 ? 'medium-coverage' : 'low-coverage'}">
                ${data.coverage}%
              </span>
              <div class="coverage-bar">
                <div class="coverage-fill" style="width: ${Math.min(data.coverage, 100)}%"></div>
              </div>
            </td>
            <td>${data.lines}</td>
            <td>${data.branches}</td>
            <td>${data.functions}</td>
            <td>${data.statements}</td>
          </tr>
        `).join('')}
      </tbody>
    </table>

    <div class="recommendations">
      <h3>💡 改进建议</h3>
      <ul>
        ${report.summary.recommendations.map(rec => `<li>${rec.replace(/\n/g, '<br>')}</li>`).join('')}
      </ul>
    </div>

    <div style="margin-top: 30px; padding-top: 20px; border-top: 1px solid #ddd; color: #7f8c8d; font-size: 0.9em;">
      <p>生成时间：${new Date().toLocaleString('zh-CN')}</p>
      <p>目标覆盖率：100%</p>
    </div>
  </div>
</body>
</html>
  `.trim();

  fs.writeFileSync(outputFile, html, 'utf-8');
  console.log(`HTML report generated: ${outputFile}`);
}

/**
 * 生成 Markdown 报告
 */
export function generateMarkdownReport(report: CoverageReport, outputFile: string = './coverage/REPORT.md'): void {
  const md = `
# 📊 Models 层测试覆盖率报告

**生成时间**: ${new Date().toLocaleString('zh-CN')}  
**目标覆盖率**: 100%

## 📋 总结

${report.summary.message}

### 关键指标

| 指标 | 数值 |
|------|------|
| 总体覆盖率 | ${report.total.coverage}% |
| 测试模型数 | ${Object.keys(report.models).length} |
| 总文件数 | ${report.total.files} |
| 状态 | ${report.summary.status} |

## 📈 模型覆盖率详情

| 模型名称 | 覆盖率 | 代码行数 | 分支数 | 函数数 | 语句数 |
|----------|--------|----------|--------|--------|--------|
${Object.entries(report.models).map(([name, data]) => 
  `| ${name} | ${data.coverage}% | ${data.lines} | ${data.branches} | ${data.functions} | ${data.statements} |`
).join('\n')}

## 💡 改进建议

${report.summary.recommendations.map(rec => `- ${rec}`).join('\n')}

---

*报告由 Test Coverage Report Generator 自动生成*
  `.trim();

  fs.writeFileSync(outputFile, md, 'utf-8');
  console.log(`Markdown report generated: ${outputFile}`);
}

// CLI usage
if (require.main === module) {
  const coverageDir = process.argv[2] || './coverage';
  const outputDir = process.argv[3] || './coverage';

  console.log('Generating test coverage report...');
  console.log(`Coverage directory: ${coverageDir}`);
  
  const report = generateCoverageReport(coverageDir);
  
  generateHtmlReport(report, path.join(outputDir, 'report.html'));
  generateMarkdownReport(report, path.join(outputDir, 'REPORT.md'));
  
  console.log('\n' + report.summary.message);
  if (report.summary.recommendations.length > 0) {
    console.log('\nRecommendations:');
    report.summary.recommendations.forEach(rec => console.log(`  ${rec}`));
  }
}
