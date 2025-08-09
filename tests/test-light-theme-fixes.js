// 测试白色主题修复的脚本
// Test script for light theme fixes

console.log('🧪 测试白色主题修复...');

// 检查CSS规则是否正确应用
function testLightThemeStyles() {
    const results = [];
    
    // 创建测试元素
    const testContainer = document.createElement('div');
    testContainer.className = 'test-container';
    testContainer.style.position = 'absolute';
    testContainer.style.top = '-9999px';
    testContainer.style.left = '-9999px';
    document.body.appendChild(testContainer);
    
    // 确保处于白色主题
    document.documentElement.classList.remove('dark');
    document.documentElement.classList.add('light');
    
    // 测试输入框样式
    const input = document.createElement('input');
    input.type = 'text';
    input.placeholder = '搜索聊天历史...';
    input.className = 'w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500 dark:bg-gray-700 dark:border-gray-600 dark:text-white dark:placeholder-gray-400';
    testContainer.appendChild(input);
    
    // 测试选择框样式
    const select = document.createElement('select');
    select.className = 'w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500 dark:bg-gray-700 dark:border-gray-600 dark:text-white';
    const option1 = document.createElement('option');
    option1.value = 'zh';
    option1.textContent = '中文';
    const option2 = document.createElement('option');
    option2.value = 'en';
    option2.textContent = 'English';
    select.appendChild(option1);
    select.appendChild(option2);
    testContainer.appendChild(select);
    
    // 测试文本区域样式
    const textarea = document.createElement('textarea');
    textarea.placeholder = '{"mcpServers": {"server-name": {"command": "uvx", "args": ["package@latest"]}}}';
    textarea.className = 'w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500 dark:bg-gray-700 dark:border-gray-600 dark:text-white dark:placeholder-gray-400';
    testContainer.appendChild(textarea);
    
    // 测试信息框样式
    const infoBox = document.createElement('div');
    infoBox.className = 'bg-blue-50 dark:bg-blue-900/20 border border-blue-200 dark:border-blue-800 rounded-lg p-4';
    const infoText = document.createElement('p');
    infoText.className = 'text-sm text-blue-700 dark:text-blue-300';
    infoText.textContent = '这是一个测试信息框';
    infoBox.appendChild(infoText);
    testContainer.appendChild(infoBox);
    
    // 强制重新计算样式
    testContainer.offsetHeight;
    
    // 检查计算后的样式
    const inputStyles = window.getComputedStyle(input);
    const selectStyles = window.getComputedStyle(select);
    const textareaStyles = window.getComputedStyle(textarea);
    const infoBoxStyles = window.getComputedStyle(infoBox);
    const infoTextStyles = window.getComputedStyle(infoText);
    
    // 验证输入框样式
    results.push({
        element: 'input',
        backgroundColor: inputStyles.backgroundColor,
        color: inputStyles.color,
        borderColor: inputStyles.borderColor,
        expected: {
            backgroundColor: 'rgb(255, 255, 255)', // white
            color: 'rgb(31, 41, 55)', // gray-900
        }
    });
    
    // 验证选择框样式
    results.push({
        element: 'select',
        backgroundColor: selectStyles.backgroundColor,
        color: selectStyles.color,
        borderColor: selectStyles.borderColor,
        expected: {
            backgroundColor: 'rgb(255, 255, 255)', // white
            color: 'rgb(31, 41, 55)', // gray-900
        }
    });
    
    // 验证文本区域样式
    results.push({
        element: 'textarea',
        backgroundColor: textareaStyles.backgroundColor,
        color: textareaStyles.color,
        borderColor: textareaStyles.borderColor,
        expected: {
            backgroundColor: 'rgb(255, 255, 255)', // white
            color: 'rgb(31, 41, 55)', // gray-900
        }
    });
    
    // 验证信息框样式
    results.push({
        element: 'info-box',
        backgroundColor: infoBoxStyles.backgroundColor,
        expected: {
            backgroundColor: 'rgb(239, 246, 255)', // blue-50
        }
    });
    
    // 验证信息文本样式
    results.push({
        element: 'info-text',
        color: infoTextStyles.color,
        expected: {
            color: 'rgb(29, 78, 216)', // blue-700
        }
    });
    
    // 清理测试元素
    document.body.removeChild(testContainer);
    
    return results;
}

// 运行测试
function runTests() {
    console.log('🚀 开始测试白色主题样式...');
    
    const results = testLightThemeStyles();
    let passedTests = 0;
    let totalTests = 0;
    
    results.forEach(result => {
        totalTests++;
        let passed = true;
        let issues = [];
        
        if (result.expected.backgroundColor && result.backgroundColor !== result.expected.backgroundColor) {
            passed = false;
            issues.push(`背景色不匹配: 期望 ${result.expected.backgroundColor}, 实际 ${result.backgroundColor}`);
        }
        
        if (result.expected.color && result.color !== result.expected.color) {
            passed = false;
            issues.push(`文字颜色不匹配: 期望 ${result.expected.color}, 实际 ${result.color}`);
        }
        
        if (passed) {
            passedTests++;
            console.log(`✅ ${result.element}: 通过`);
        } else {
            console.log(`❌ ${result.element}: 失败`);
            issues.forEach(issue => console.log(`   - ${issue}`));
        }
    });
    
    console.log(`\n📊 测试结果: ${passedTests}/${totalTests} 通过`);
    
    if (passedTests === totalTests) {
        console.log('🎉 所有测试通过！白色主题修复成功。');
    } else {
        console.log('⚠️  部分测试失败，需要进一步调整CSS样式。');
    }
    
    return {
        passed: passedTests,
        total: totalTests,
        success: passedTests === totalTests
    };
}

// 如果在浏览器环境中运行
if (typeof window !== 'undefined') {
    // 等待DOM加载完成
    if (document.readyState === 'loading') {
        document.addEventListener('DOMContentLoaded', runTests);
    } else {
        runTests();
    }
} else {
    // Node.js环境
    console.log('此脚本需要在浏览器环境中运行以测试CSS样式。');
}

// 导出测试函数供其他脚本使用
if (typeof module !== 'undefined' && module.exports) {
    module.exports = { runTests, testLightThemeStyles };
}