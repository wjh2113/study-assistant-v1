/**
 * Textbook Parser Service - 课本解析服务
 * ISSUE-P1-002: 课本解析功能完善
 */

const fs = require('fs');
const path = require('path');
const pdfParse = require('pdf-parse');

class TextbookParserService {
  /**
   * 解析 PDF 课本
   * @param {string} pdfPath - PDF 文件路径
   * @returns {Promise<object>} 解析结果
   */
  static async parsePDF(pdfPath) {
    try {
      const dataBuffer = fs.readFileSync(pdfPath);
      const pdfData = await pdfParse(dataBuffer);
      
      return {
        success: true,
        text: pdfData.text,
        numpages: pdfData.numpages,
        info: pdfData.info,
        version: pdfData.version,
        metadata: {
          title: pdfData.info?.Title,
          author: pdfData.info?.Author,
          subject: pdfData.info?.Subject,
          keywords: pdfData.info?.Keywords,
          creator: pdfData.info?.Creator,
          producer: pdfData.info?.Producer,
          creationDate: pdfData.info?.CreationDate,
          modDate: pdfData.info?.ModDate
        }
      };
    } catch (error) {
      console.error('PDF 解析失败:', error.message);
      return {
        success: false,
        error: error.message
      };
    }
  }

  /**
   * 从本地存储解析 PDF
   * @param {string} localPath - 本地文件路径
   * @returns {Promise<object>} 解析结果
   */
  static async parseFromLocal(localPath) {
    try {
      // 检查文件是否存在
      await fs.access(localPath);
      
      // 解析 PDF
      const result = await this.parsePDF(localPath);
      
      return result;
    } catch (error) {
      console.error('从本地存储解析 PDF 失败:', error.message);
      return {
        success: false,
        error: error.message
      };
    }
  }

  /**
   * 使用 AI 识别目录结构（增强版）
   * @param {string} text - PDF 文本内容
   * @param {object} metadata - PDF 元数据
   * @returns {Promise<object>} 目录结构
   */
  static async recognizeStructure(text, metadata = {}) {
    const AiGatewayService = require('../ai-gateway/AiGatewayService');
    
    const prompt = this.buildStructurePrompt(text, metadata);
    
    const result = await AiGatewayService.callModel('qwen-plus', prompt, {
      systemPrompt: '你是一个教育内容分析专家，擅长识别课本的目录结构和章节划分。请准确识别单元、章节、知识点层级结构。',
      maxTokens: 4096,
      temperature: 0.3
    });

    if (!result.success) {
      throw new Error(`目录识别失败：${result.error}`);
    }

    return this.parseStructureResult(result.data);
  }

  /**
   * 构建增强的目录识别提示词
   */
  static buildStructurePrompt(text, metadata = {}) {
    // 截取前 15000 字符用于目录识别（通常目录在前面）
    const sampleText = text.substring(0, 15000);
    
    const metaInfo = metadata.title || metadata.subject ? `
【PDF 元数据】
- 标题：${metadata.title || '未知'}
- 主题：${metadata.subject || '未知'}
- 作者：${metadata.author || '未知'}
- 关键词：${metadata.keywords || '未知'}
` : '';

    return `请分析以下课本内容，识别其完整的目录结构和章节划分。

${metaInfo}
【课本内容样本】
${sampleText}

【任务要求】
1. 识别课本的基本信息（年级、科目、版本等）
2. 识别完整的层级结构：单元(Unit) -> 章节(Chapter) -> 小节(Section)
3. 提取每个层级的标题和预估页码范围
4. 识别每个章节的核心知识点关键词
5. 如果内容包含练习题、总结等特殊部分，也请标注

【输出格式】
请严格按照以下 JSON 格式输出（不要包含 Markdown 代码块标记）：
{
  "bookInfo": {
    "grade": "年级（如：三年级、七年级）",
    "subject": "科目（如：数学、语文、英语）",
    "version": "版本（如：人教版、北师大版）",
    "totalPages": 总页数（数字，如果可知）
  },
  "structure": [
    {
      "type": "unit",
      "title": "第一单元 标题",
      "startPage": 1,
      "endPage": 10,
      "chapters": [
        {
          "title": "第 1 课 标题",
          "startPage": 1,
          "endPage": 3,
          "sections": [
            {
              "title": "小节标题",
              "startPage": 1,
              "endPage": 2
            }
          ],
          "keywords": ["关键词 1", "关键词 2"],
          "knowledgePoints": ["知识点 1", "知识点 2"]
        }
      ]
    }
  ],
  "specialSections": [
    {
      "type": "exercise|summary|appendix",
      "title": "部分标题",
      "startPage": 100
    }
  ]
}

如果无法确定页码，startPage 和 endPage 可以设为 null。`;
  }

  /**
   * 构建目录识别提示词
   */
  static buildStructurePrompt(text) {
    // 截取前 10000 字符用于目录识别（通常目录在前面）
    const sampleText = text.substring(0, 10000);

    return `请分析以下课本内容，识别其目录结构和章节划分。

【课本内容样本】
${sampleText}

【任务要求】
1. 识别课本的单元（Unit）和章节（Chapter）结构
2. 提取每个单元/章节的标题和起始位置（页码或关键词）
3. 识别课本的基本信息（年级、科目等）

【输出格式】
请严格按照以下 JSON 格式输出：
{
  "bookInfo": {
    "grade": "年级",
    "subject": "科目",
    "version": "版本",
    "totalPages": 总页数（如果可知）
  },
  "structure": [
    {
      "type": "unit",
      "title": "第一单元 标题",
      "startPage": 1,
      "endPage": 10,
      "chapters": [
        {
          "title": "第 1 课 标题",
          "startPage": 1,
          "endPage": 3,
          "keywords": ["关键词 1", "关键词 2"]
        }
      ]
    }
  ]
}

如果无法确定页码，startPage 和 endPage 可以设为 null。`;
  }

  /**
   * 解析 AI 返回的结构结果（增强版）
   */
  static parseStructureResult(responseText) {
    try {
      // 尝试提取 JSON（处理可能的 Markdown 代码块）
      let jsonString = responseText;
      
      // 移除 Markdown 代码块标记
      jsonString = jsonString.replace(/```json\s*/g, '').replace(/```\s*/g, '');
      
      // 提取 JSON 对象
      const jsonMatch = jsonString.match(/\{[\s\S]*\}/);
      jsonString = jsonMatch ? jsonMatch[0] : jsonString;
      
      const parsed = JSON.parse(jsonString);
      
      // 验证并规范化结构
      return this.normalizeStructure(parsed);
    } catch (error) {
      console.error('结构解析失败:', error.message);
      // 返回简化结构
      return {
        bookInfo: {
          grade: '未知',
          subject: '未知',
          version: '未知',
          totalPages: null
        },
        structure: [],
        specialSections: []
      };
    }
  }

  /**
   * 规范化结构数据
   */
  static normalizeStructure(data) {
    const normalized = {
      bookInfo: {
        grade: data.bookInfo?.grade || '未知',
        subject: data.bookInfo?.subject || '未知',
        version: data.bookInfo?.version || '未知',
        totalPages: data.bookInfo?.totalPages || null
      },
      structure: [],
      specialSections: data.specialSections || []
    };

    if (Array.isArray(data.structure)) {
      normalized.structure = data.structure.map(unit => ({
        type: 'unit',
        title: unit.title || '未命名单元',
        startPage: unit.startPage || null,
        endPage: unit.endPage || null,
        chapters: Array.isArray(unit.chapters) ? unit.chapters.map(chapter => ({
          title: chapter.title || '未命名章节',
          startPage: chapter.startPage || null,
          endPage: chapter.endPage || null,
          sections: Array.isArray(chapter.sections) ? chapter.sections : [],
          keywords: chapter.keywords || [],
          knowledgePoints: chapter.knowledgePoints || []
        })) : []
      }));
    }

    return normalized;
  }

  /**
   * 按单元/章节分割文本
   * @param {string} fullText - 完整文本
   * @param {array} structure - 结构信息
   * @returns {object} 分割后的内容
   */
  static splitByStructure(fullText, structure) {
    const sections = {};

    if (!structure || !structure.structure || structure.structure.length === 0) {
      // 如果没有结构信息，按大段分割
      return this.splitByDefault(fullText);
    }

    for (const unit of structure.structure) {
      const unitKey = `unit_${unit.title}`;
      sections[unitKey] = {
        type: 'unit',
        title: unit.title,
        content: '',
        chapters: {}
      };

      if (unit.chapters && unit.chapters.length > 0) {
        for (const chapter of unit.chapters) {
          const chapterKey = `chapter_${chapter.title}`;
          sections[unitKey].chapters[chapterKey] = {
            type: 'chapter',
            title: chapter.title,
            content: this.extractSectionContent(fullText, chapter),
            keywords: chapter.keywords || []
          };
        }
      }

      // 单元内容为所有章节内容之和
      sections[unitKey].content = Object.values(sections[unitKey].chapters)
        .map(c => c.content)
        .join('\n\n');
    }

    return sections;
  }

  /**
   * 默认分割策略（按段落和空行）
   */
  static splitByDefault(text) {
    const sections = {};
    
    // 按双换行符分割大段
    const paragraphs = text.split(/\n\s*\n/);
    let currentSection = 'default';
    let sectionIndex = 0;

    sections[currentSection] = {
      type: 'section',
      title: '默认分段',
      content: '',
      chapters: {}
    };

    for (const para of paragraphs) {
      const trimmed = para.trim();
      if (!trimmed) continue;

      // 检测是否是新章节标题（简单启发式）
      if (/^(第 [一二三四五六七八九十\d]+[章节单元]|Unit \d+|Chapter \d+)/i.test(trimmed)) {
        sectionIndex++;
        currentSection = `section_${sectionIndex}`;
        sections[currentSection] = {
          type: 'section',
          title: trimmed,
          content: trimmed,
          chapters: {}
        };
      } else {
        sections[currentSection].content += '\n' + trimmed;
      }
    }

    return sections;
  }

  /**
   * 提取章节内容（基于关键词或页码）
   */
  static extractSectionContent(fullText, chapter) {
    if (!chapter.startPage && !chapter.endPage && (!chapter.keywords || chapter.keywords.length === 0)) {
      return '';
    }

    // 如果有页码信息，尝试按页码提取（需要 PDF 原文有页码标记）
    // 这里简化处理，使用关键词匹配
    
    if (chapter.keywords && chapter.keywords.length > 0) {
      const lines = fullText.split('\n');
      const relevantLines = [];
      let found = false;

      for (const line of lines) {
        const hasKeyword = chapter.keywords.some(kw => line.includes(kw));
        if (hasKeyword) {
          found = true;
        }
        if (found) {
          relevantLines.push(line);
          // 收集 50 行后停止
          if (relevantLines.length >= 50) break;
        }
      }

      return relevantLines.join('\n');
    }

    return '';
  }

  /**
   * 提取知识点（增强版）
   * @param {string} content - 章节内容
   * @param {string} subject - 科目
   * @param {string} grade - 年级
   * @returns {Promise<array>} 知识点列表
   */
  static async extractKnowledgePoints(content, subject = '', grade = '') {
    const AiGatewayService = require('../ai-gateway/AiGatewayService');

    const prompt = `请从以下课本内容中提取关键知识点：

【科目】${subject || '综合'}
【年级】${grade || '未知'}

【内容】
${content.substring(0, 4000)}

【要求】
1. 提取 5-15 个核心知识点
2. 每个知识点包含：
   - name: 知识点名称（简洁明了）
   - description: 简要描述（50 字以内）
   - difficulty: 难度等级（basic/intermediate/advanced）
   - tags: 相关标签（2-5 个）
   - prerequisites: 前置知识点（可选）
3. 知识点要符合该年级学生的认知水平

【输出格式】
JSON 数组：
[
  {
    "name": "知识点名称",
    "description": "简要描述",
    "difficulty": "basic|intermediate|advanced",
    "tags": ["标签 1", "标签 2"],
    "prerequisites": ["前置知识点 1"]
  }
]`;

    const result = await AiGatewayService.callModel('qwen-plus', prompt, {
      systemPrompt: '你是一个教育内容分析专家，擅长从课本中提取和归纳知识点，并能根据年级调整知识点的难度和表述。'
    });

    if (!result.success) {
      return [];
    }

    try {
      const jsonMatch = result.data.match(/\[[\s\S]*\]/);
      const jsonString = jsonMatch ? jsonMatch[0] : result.data;
      const points = JSON.parse(jsonString);
      
      // 规范化知识点数据
      return points.map(p => ({
        name: p.name || '未命名知识点',
        description: p.description || '',
        difficulty: ['basic', 'intermediate', 'advanced'].includes(p.difficulty) ? p.difficulty : 'intermediate',
        tags: Array.isArray(p.tags) ? p.tags : [],
        prerequisites: Array.isArray(p.prerequisites) ? p.prerequisites : []
      }));
    } catch (error) {
      console.error('知识点提取失败:', error.message);
      return [];
    }
  }

  /**
   * 完整解析流程（异步 Worker 使用）
   * @param {string} pdfPath - PDF 文件路径
   * @param {string} textbookId - 课本 ID
   * @param {Function} progressCallback - 进度回调
   * @returns {Promise<object>} 完整解析结果
   */
  static async parseComplete(pdfPath, textbookId, progressCallback) {
    const result = {
      textbookId,
      success: false,
      stages: {}
    };

    try {
      // Stage 1: PDF 文本提取
      if (progressCallback) progressCallback({ stage: 'extract', progress: 0.1 });
      console.log(`📖 [${textbookId}] Stage 1: 提取 PDF 文本...`);
      
      const pdfResult = await this.parsePDF(pdfPath);
      if (!pdfResult.success) {
        throw new Error(pdfResult.error);
      }
      
      result.stages.extract = {
        success: true,
        pageCount: pdfResult.numpages,
        textLength: pdfResult.text.length,
        metadata: pdfResult.metadata
      };

      // Stage 2: 目录结构识别
      if (progressCallback) progressCallback({ stage: 'structure', progress: 0.4 });
      console.log(`📑 [${textbookId}] Stage 2: 识别目录结构...`);
      
      const structure = await this.recognizeStructure(pdfResult.text, pdfResult.metadata);
      result.stages.structure = {
        success: true,
        bookInfo: structure.bookInfo,
        unitsCount: structure.structure?.length || 0,
        chaptersCount: structure.structure?.reduce((sum, u) => sum + (u.chapters?.length || 0), 0) || 0
      };

      // Stage 3: 知识点提取
      if (progressCallback) progressCallback({ stage: 'knowledge', progress: 0.7 });
      console.log(`🧠 [${textbookId}] Stage 3: 提取知识点...`);
      
      const knowledgePoints = [];
      const bookInfo = structure.bookInfo;
      
      // 对每个章节提取知识点
      if (structure.structure) {
        for (const unit of structure.structure) {
          if (unit.chapters) {
            for (const chapter of unit.chapters) {
              const chapterContent = this.extractSectionContent(pdfResult.text, chapter);
              if (chapterContent) {
                const points = await this.extractKnowledgePoints(
                  chapterContent,
                  bookInfo.subject,
                  bookInfo.grade
                );
                
                knowledgePoints.push(...points.map(p => ({
                  ...p,
                  unit: unit.title,
                  chapter: chapter.title
                })));
              }
            }
          }
        }
      }
      
      result.stages.knowledge = {
        success: true,
        knowledgePointsCount: knowledgePoints.length,
        knowledgePoints
      };

      // Stage 4: 整合结果
      if (progressCallback) progressCallback({ stage: 'complete', progress: 1.0 });
      console.log(`✅ [${textbookId}] Stage 4: 整合解析结果...`);
      
      result.success = true;
      result.parseResult = {
        bookInfo: structure.bookInfo,
        structure: structure.structure,
        specialSections: structure.specialSections,
        knowledgePoints,
        rawText: pdfResult.text,
        metadata: pdfResult.metadata
      };

      return result;
    } catch (error) {
      console.error(`❌ [${textbookId}] 解析失败:`, error);
      result.error = error.message;
      return result;
    }
  }
}

module.exports = TextbookParserService;
