import axios from 'axios';
import type { SalesScore } from './salesDataLoader';

interface EvaluationResponse {
    result: string;
    error?: string;
}

export const getAIEvaluation = async (salesData: SalesScore): Promise<string> => {
    try {
        const message = `请整合以下一或多段录音评价理由，列出1234但不要加粗或变为标题格式，保留一些录音中的例子，不要出现评分数据，不要改变内容和例子或创造新的数据，字数150字以内：
${salesData.理由}`;

        const response = await axios.post<EvaluationResponse>('http://localhost:3001/api/evaluate', {
            message
        }, {
            timeout: 30000 // 设置30秒超时
        });

        if (!response.data?.result) {
            console.error('Invalid API response format:', response.data);
            return '评价生成失败：API 返回格式异常';
        }

        return response.data.result || '暂无评价内容';
    } catch (error: any) {
        if (error?.isAxiosError) {
            if (error.code === 'ECONNABORTED') {
                console.error('API request timeout:', error);
                return '评价生成超时，请稍后重试';
            }
            if (error.response) {
                console.error('API error response:', error.response.data);
                return `评价生成失败：${error.response.status} - ${error.response.statusText}`;
            }
            if (error.request) {
                console.error('No API response:', error.request);
                return '评价生成失败：无法连接到服务器';
            }
        }
        console.error('Error getting AI evaluation:', error);
        return '评价生成失败，请稍后重试';
    }
}; 