import warnings
warnings.filterwarnings("ignore")
from openai import OpenAI
from flask import Flask, request, jsonify
from flask_cors import CORS
import time

app = Flask(__name__)
CORS(app)

def chat(message):
    client = OpenAI(
        api_key="eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJ1c2VybmFtZSI6IiIsInV1aWQiOiJ1SiVEMVhaSW91UFlwJCprLTlmNWMxYmNkLWZhOWYtNGM5OC1iNTAxLTlhYTcxZTZmNjMzOSJ9.4YOGpWUHRLPthGkKJsAVG31Xk3ZyEMOtsptLOIaRpT4",
        base_url="https://muses.weizhipin.com/muses-open/openai/v1",
        timeout=25.0  # 设置25秒超时
    )
    messages = message 
    try:
        start_time = time.time()
        stream = client.chat.completions.create(
            model="nanbeige2-turbo-0918",
            messages=[{"role": "user", "content": f'{messages}'}],
            max_tokens=4096,
            temperature=0.6,
            stream=False,
        )
        end_time = time.time()
        print(f"API响应时间: {end_time - start_time:.2f}秒")
        text = stream.choices[0].message.content
        print(f"原始AI响应: {text}")
        
        return text
    except Exception as e:
        print(f"API调用出错: {str(e)}")
        raise e

@app.route('/api/evaluate', methods=['POST'])
def evaluate():
    data = request.json
    if not data or 'message' not in data:
        return jsonify({'error': '缺少必要的参数'}), 400
    
    try:
        result = chat(data['message'])
        return jsonify({'result': result})
    except Exception as e:
        print(f"评估请求处理出错: {str(e)}")
        return jsonify({'error': str(e)}), 500

if __name__ == '__main__':
    app.run(port=3001) 