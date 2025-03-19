import pandas as pd
import numpy as np
import os

def process_data():
    print("开始处理数据...")
    
    # 检查输入文件是否存在
    input_files = [
        './public/data/sales_scores.csv',
        './public/data/sales_performance.csv',
        './public/data/sales_fight_sec.csv'
    ]
    
    for file_path in input_files:
        if not os.path.exists(file_path):
            print(f"错误: 输入文件不存在: {file_path}")
            return
    
    # 确保输出目录存在
    output_dir = './public/data/'
    if not os.path.exists(output_dir):
        print(f"创建输出目录: {output_dir}")
        os.makedirs(output_dir)
    
    # 读取数据时添加更多错误处理
    try:
        sales_scores = pd.read_csv('./public/data/sales_scores.csv')
        print(f"成功读取sales_scores.csv, 行数: {len(sales_scores)}")
    except Exception as e:
        print(f"读取sales_scores.csv失败: {e}")
        return

    # 读取数据
    sales_performance = pd.read_csv('./public/data/sales_performance.csv')
    sales_fight_sec = pd.read_csv('./public/data/sales_fight_sec.csv')  # 新增数据文件
    
    # 读取已处理的城市数据，确保包含所有新添加的城市
    try:
        processed_city_data = pd.read_csv('./public/data/processed_city_data.csv')
        all_cities = processed_city_data['d5_name'].unique().tolist()
        print(f"读取到 {len(all_cities)} 个城市: {all_cities}")
    except Exception as e:
        print(f"读取城市数据失败: {e}")
        all_cities = []

    # 确保 fight_sec_rate 是数值类型
    sales_fight_sec['fight_sec_rate'] = pd.to_numeric(sales_fight_sec['fight_sec_rate'].str.rstrip('%').astype('float') / 100, errors='coerce')

    # 定义需要处理的维度
    dimensions = [
        '主动掌控对话节奏',
        '异议应对韧性',
        '决策推进与闭环',
        '量化价值呈现',
        '灵活应变能力',
        '情绪感染力'
    ]

    # 将6个维度都乘以1.2
    for dim in dimensions:
        sales_scores[dim] = pd.to_numeric(sales_scores[dim], errors='coerce') * 1.2

    # 销售层面的数据处理
    sales_level = sales_scores.groupby(['call_user_id', 'user_name']).agg({
        '主动掌控对话节奏': lambda x: pd.to_numeric(x, errors='coerce').mean(),
        '异议应对韧性': lambda x: pd.to_numeric(x, errors='coerce').mean(),
        '决策推进与闭环': lambda x: pd.to_numeric(x, errors='coerce').mean(),
        '量化价值呈现': lambda x: pd.to_numeric(x, errors='coerce').mean(),
        '灵活应变能力': lambda x: pd.to_numeric(x, errors='coerce').mean(),
        '情绪感染力': lambda x: pd.to_numeric(x, errors='coerce').mean(),
        '销售士气评分': lambda x: pd.to_numeric(x, errors='coerce').mean(),
        '销售士气': lambda x: '、'.join(x.dropna()),
        '理由': lambda x: '。下一通：'.join(x.dropna()),
        'd5_name': 'first',
        'd8_name': 'first'
    }).reset_index()

    # 合并销售层面的数据
    sales_merged = pd.merge(
        sales_level,
        sales_performance[['user_id', 'sales_target_rate', 'ms', 'd8_name']],
        left_on=['call_user_id', 'd8_name'],
        right_on=['user_id', 'd8_name'],
        how='left'
    )

    # 确保 sales_target_rate 是数值类型
    sales_merged['sales_target_rate'] = pd.to_numeric(sales_merged['sales_target_rate'], errors='coerce')

    # 合并战斗力数据
    sales_merged = pd.merge(
        sales_merged,
        sales_fight_sec[['user_id', 'fight_sec_rate']],
        left_on='call_user_id',
        right_on='user_id',
        how='left'
    )

    # 计算销售的士气综合得分（新公式）
    sales_merged['销售士气综合得分'] = (
        0.5 * pd.to_numeric(sales_merged['销售士气评分'], errors='coerce').fillna(5) * 1.2 / 10 + 
        0.3 * pd.to_numeric(sales_merged['sales_target_rate'], errors='coerce').fillna(0.5) / 2 + 
        0.2 * pd.to_numeric(sales_merged['fight_sec_rate'], errors='coerce').fillna(0.33)
    ) * 12

    sales_merged = sales_merged.groupby(['call_user_id', 'user_name']).agg({
        '主动掌控对话节奏': lambda x: pd.to_numeric(x, errors='coerce').mean(),
        '异议应对韧性': lambda x: pd.to_numeric(x, errors='coerce').mean(),
        '决策推进与闭环': lambda x: pd.to_numeric(x, errors='coerce').mean(),
        '量化价值呈现': lambda x: pd.to_numeric(x, errors='coerce').mean(),
        '灵活应变能力': lambda x: pd.to_numeric(x, errors='coerce').mean(),
        '情绪感染力': lambda x: pd.to_numeric(x, errors='coerce').mean(),
        '销售士气评分': lambda x: pd.to_numeric(x, errors='coerce').mean(),
        '销售士气综合得分': lambda x: pd.to_numeric(x, errors='coerce').mean(),
        'fight_sec_rate': lambda x: pd.to_numeric(x, errors='coerce').mean(),
        'sales_target_rate': lambda x: pd.to_numeric(x, errors='coerce').mean(),
        '销售士气': 'first',
        '理由': 'first',
        'd5_name': 'first',
        'd8_name': 'first',
        'ms': lambda x: pd.to_numeric(x, errors='coerce').sum()
    }).reset_index()

    # 团队层面的数据处理
    # 使用 sales_merged 数据进行团队聚合，这样已经包含了 fight_sec_rate
    sales_merged['team'] = sales_merged['d5_name'] + sales_merged['d8_name']
    
    team_level = sales_merged.groupby('team').agg({
        '主动掌控对话节奏': lambda x: pd.to_numeric(x, errors='coerce').mean(),
        '异议应对韧性': lambda x: pd.to_numeric(x, errors='coerce').mean(),
        '决策推进与闭环': lambda x: pd.to_numeric(x, errors='coerce').mean(),
        '量化价值呈现': lambda x: pd.to_numeric(x, errors='coerce').mean(),
        '灵活应变能力': lambda x: pd.to_numeric(x, errors='coerce').mean(),
        '情绪感染力': lambda x: pd.to_numeric(x, errors='coerce').mean(),
        '销售士气评分': lambda x: pd.to_numeric(x, errors='coerce').mean(),
        'fight_sec_rate': lambda x: pd.to_numeric(x, errors='coerce').mean(),
        'sales_target_rate': lambda x: pd.to_numeric(x, errors='coerce').mean(),
        'd5_name': 'first',
        'd8_name': 'first',
        'ms': lambda x: pd.to_numeric(x, errors='coerce').sum()
    }).reset_index()
    
    # 填充缺失值
    team_level = team_level.fillna({
        '异议应对韧性': 5.0,
        'fight_sec_rate': 0.33,
        'sales_target_rate': 0.5
    })

    # 计算团队士气综合得分（新公式）
    # 添加调试日志，检查杭州KA1团队的数据
    debug_team = team_level[team_level['team'] == '杭州KA1']
    if not debug_team.empty:
        print("\n杭州KA1团队数据检查:")
        print(f"销售士气评分: {debug_team['销售士气评分'].values[0]}")
        print(f"sales_target_rate: {debug_team['sales_target_rate'].values[0]}")
        print(f"fight_sec_rate: {debug_team['fight_sec_rate'].values[0]}")
        
    # 修改计算逻辑，确保处理缺失值
    team_level['团队士气综合得分'] = (
        0.5 * pd.to_numeric(team_level['销售士气评分'], errors='coerce').fillna(5) * 1.2 / 10 + 
        0.3 * pd.to_numeric(team_level['sales_target_rate'], errors='coerce').fillna(0.5) / 2 + 
        0.2 * pd.to_numeric(team_level['fight_sec_rate'], errors='coerce').fillna(0.33)
    ) * 12
    
    # 再次检查计算后的结果
    debug_team = team_level[team_level['team'] == '杭州KA1']
    if not debug_team.empty:
        print(f"计算后的团队士气综合得分: {debug_team['团队士气综合得分'].values[0]}")
        print(f"是否为NaN: {pd.isna(debug_team['团队士气综合得分'].values[0])}")

    # 重命名字段以匹配前端期望
    team_level['城市'] = team_level['d5_name']
    team_level['销售团队'] = team_level['d8_name']

    
    # 城市层面的数据处理
    # 使用 sales_merged 数据进行城市聚合，这样已经包含了 fight_sec_rate
    city_level = sales_merged.groupby('d5_name').agg({
        '主动掌控对话节奏': lambda x: pd.to_numeric(x, errors='coerce').mean(),
        '异议应对韧性': lambda x: pd.to_numeric(x, errors='coerce').mean(),
        '决策推进与闭环': lambda x: pd.to_numeric(x, errors='coerce').mean(),
        '量化价值呈现': lambda x: pd.to_numeric(x, errors='coerce').mean(),
        '灵活应变能力': lambda x: pd.to_numeric(x, errors='coerce').mean(),
        '情绪感染力': lambda x: pd.to_numeric(x, errors='coerce').mean(),
        '销售士气评分': lambda x: pd.to_numeric(x, errors='coerce').mean(),
        'fight_sec_rate': lambda x: pd.to_numeric(x, errors='coerce').mean(),
        'sales_target_rate': lambda x: pd.to_numeric(x, errors='coerce').mean(),
        'ms': lambda x: pd.to_numeric(x, errors='coerce').sum()
    }).reset_index()

    # 计算城市士气综合得分（新公式）
    city_level['城市士气综合得分'] = (
        0.5 * pd.to_numeric(city_level['销售士气评分'], errors='coerce').fillna(5) * 1.2 / 10 + 
        0.3 * pd.to_numeric(city_level['sales_target_rate'], errors='coerce').fillna(0.5) / 2 + 
        0.2 * pd.to_numeric(city_level['fight_sec_rate'], errors='coerce').fillna(0.33)
    ) * 12

    # 保存处理后的数据，只保存需要的字段
    sales_output = sales_merged[['user_name', '主动掌控对话节奏', '异议应对韧性', '决策推进与闭环', 
                                '量化价值呈现', '灵活应变能力', '情绪感染力', '销售士气综合得分', '销售士气', '理由', 'd5_name', 'd8_name']]
    
    # 重命名列名以匹配前端期望
    sales_output = sales_output.rename(columns={'d5_name': '城市', 'd8_name': '团队'})
    
    team_output = team_level[['城市', '销售团队', '主动掌控对话节奏', '异议应对韧性', '决策推进与闭环',
                              '量化价值呈现', '灵活应变能力', '情绪感染力', '团队士气综合得分']]
    
    # 使用processed_city_data作为城市输出数据，确保包含所有新添加的城市
    city_output = processed_city_data
    
    # 保存前检查数据
    print(f"sales_output 列: {sales_output.columns.tolist()}")
    print(f"team_output 列: {team_output.columns.tolist()}")
    print(f"city_output 列: {city_output.columns.tolist()}")
    
    # 保存处理后的数据
    try:
        sales_output.to_csv('./public/data/processed_sales_data.csv', index=False)
        team_output.to_csv('./public/data/processed_team_data.csv', index=False)
        city_output.to_csv('./public/data/processed_city_data.csv', index=False)
        print("数据文件保存成功")
    except Exception as e:
        print(f"保存数据文件失败: {e}")
    
    print("数据处理完成")

if __name__ == '__main__':
    process_data() 