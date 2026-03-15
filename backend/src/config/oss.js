/**
 * 阿里云 OSS 配置（已弃用）
 * 
 * ⚠️ 注意：项目已切换到本地文件存储
 * - 上传目录：backend/uploads/
 * - 访问 URL: http://localhost:3000/uploads/filename
 * 
 * 此文件保留用于未来可能的 OSS 集成
 * 当前使用 routes/upload.js 中的 multer 本地存储
 */

// OSS 客户端已禁用，使用本地存储
// const OSS = require('oss-client');

// OSS 客户端配置
const ossClient = new OSS({
  region: process.env.OSS_REGION || 'oss-cn-hangzhou',
  accessKeyId: process.env.OSS_ACCESS_KEY_ID,
  accessKeySecret: process.env.OSS_ACCESS_KEY_SECRET,
  bucket: process.env.OSS_BUCKET || 'studyass-dev',
  secure: true, // 使用 HTTPS
  timeout: 60000, // 60 秒超时
});

/**
 * 上传文件到 OSS
 * @param {string} localFile - 本地文件路径
 * @param {string} objectName - OSS 对象名称（包含路径）
 * @param {Object} options - 上传选项
 * @returns {Promise<Object>} 上传结果
 */
async function uploadFile(localFile, objectName, options = {}) {
  try {
    const result = await ossClient.put(objectName, localFile, {
      headers: {
        'Content-Type': options.contentType || 'application/octet-stream',
        'Cache-Control': options.cacheControl || 'no-cache',
      },
      ...options,
    });
    
    console.log(`✅ 文件上传成功：${objectName}`);
    
    return {
      success: true,
      url: result.url,
      name: result.name,
      size: result.size,
      etag: result.etag,
    };
  } catch (error) {
    console.error(`❌ 文件上传失败：${objectName}`, error);
    throw error;
  }
}

/**
 * 上传课本 PDF（带进度回调）
 * @param {string} localFile - 本地文件路径
 * @param {string} textbookId - 课本 ID
 * @param {Function} progressCallback - 进度回调函数
 * @returns {Promise<Object>} 上传结果
 */
async function uploadTextbookPDF(localFile, textbookId, progressCallback) {
  const objectName = `textbooks/${textbookId}/${Date.now()}.pdf`;
  
  try {
    const result = await ossClient.multipartUpload(objectName, localFile, {
      progress: (progress, checkpoint, res) => {
        if (progressCallback) {
          progressCallback(progress); // 0-1 之间的数字
        }
      },
      headers: {
        'Content-Type': 'application/pdf',
      },
    });
    
    console.log(`✅ 课本 PDF 上传成功：${result.name}`);
    
    return {
      success: true,
      url: result.url,
      name: result.name,
      bucket: result.bucket,
      etag: result.etag,
    };
  } catch (error) {
    console.error(`❌ 课本 PDF 上传失败：${textbookId}`, error);
    throw error;
  }
}

/**
 * 获取文件 URL（带签名，用于私有文件）
 * @param {string} objectName - OSS 对象名称
 * @param {number} expires - 过期时间（秒）
 * @returns {string} 签名后的 URL
 */
function getSignedUrl(objectName, expires = 3600) {
  const url = ossClient.signatureUrl(objectName, {
    expires: expires,
  });
  return url;
}

/**
 * 删除文件
 * @param {string} objectName - OSS 对象名称
 * @returns {Promise<Object>} 删除结果
 */
async function deleteFile(objectName) {
  try {
    const result = await ossClient.delete(objectName);
    console.log(`✅ 文件删除成功：${objectName}`);
    return {
      success: true,
      deleted: result.res.status === 204,
    };
  } catch (error) {
    console.error(`❌ 文件删除失败：${objectName}`, error);
    throw error;
  }
}

/**
 * 批量删除文件
 * @param {string[]} objectNames - OSS 对象名称列表
 * @returns {Promise<Object>} 删除结果
 */
async function deleteFiles(objectNames) {
  try {
    const result = await ossClient.deleteMulti(objectNames);
    console.log(`✅ 批量删除成功：${objectNames.length}个文件`);
    return {
      success: true,
      deleted: result.deleted,
    };
  } catch (error) {
    console.error(`❌ 批量删除失败:`, error);
    throw error;
  }
}

module.exports = {
  ossClient,
  uploadFile,
  uploadTextbookPDF,
  getSignedUrl,
  deleteFile,
  deleteFiles,
};
