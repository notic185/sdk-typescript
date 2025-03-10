import { config } from 'dotenv';

// 加载测试环境变量
config({ path: '.env.test' });

// 全局测试前初始化
beforeAll(() => {
    // 初始化数据库连接等
});

// 全局测试后清理
afterAll(() => {
    // 关闭数据库连接等
});