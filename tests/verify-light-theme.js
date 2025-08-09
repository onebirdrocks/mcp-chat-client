#!/usr/bin/env node

// 验证白色主题CSS修复的脚本
// Script to verify light theme CSS fixes

import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

console.log('🔍 验证白色主题CSS修复...\n');

// 读取CSS文件
const cssPath = path.join(__dirname, 'src', 'index.css');
let cssContent = '';

try {
    cssContent = fs.readFileSync(cssPath, 'utf8');
    console.log('✅ 成功读取CSS文件');
} catch (error) {
    console.error('❌ 无法读取CSS文件:', error.message);
    process.exit(1);
}

// 检查必要的CSS规则
const requiredRules = [
    {
        name: '输入框白色背景',
        pattern: /html:not\(\.dark\)\s+input[^{]*\{[^}]*background-color:\s*#ffffff\s*!important/,
        description: '确保输入框在白色主题下有白色背景'
    },
    {
        name: '选择框白色背景',
        pattern: /html:not\(\.dark\)\s+select[^{]*\{[^}]*background-color:\s*#ffffff\s*!important/,
        description: '确保选择框在白色主题下有白色背景'
    },
    {
        name: '文本区域白色背景',
        pattern: /html:not\(\.dark\)\s+textarea[^{]*\{[^}]*background-color:\s*#ffffff\s*!important/,
        description: '确保文本区域在白色主题下有白色背景'
    },
    {
        name: '输入框深色文字',
        pattern: /html:not\(\.dark\)\s+input[^{]*\{[^}]*color:\s*#1f2937\s*!important/,
        description: '确保输入框在白色主题下有深色文字'
    },
    {
        name: '蓝色信息框背景',
        pattern: /html:not\(\.dark\)\s+\.bg-blue-50[^{]*\{[^}]*background-color:\s*#eff6ff\s*!important/,
        description: '确保蓝色信息框在白色主题下有正确的背景色'
    },
    {
        name: '蓝色文字颜色',
        pattern: /html:not\(\.dark\)\s+\.text-blue-700[^{]*\{[^}]*color:\s*#1d4ed8\s*!important/,
        description: '确保蓝色文字在白色主题下有正确的颜色'
    },
    {
        name: '占位符文字颜色',
        pattern: /html:not\(\.dark\)\s+input::placeholder[^{]*\{[^}]*color:\s*#6b7280\s*!important/,
        description: '确保占位符文字在白色主题下有正确的颜色'
    }
];

let passedChecks = 0;
let totalChecks = requiredRules.length;

console.log('检查CSS规则:\n');

requiredRules.forEach((rule, index) => {
    const found = rule.pattern.test(cssContent);
    if (found) {
        console.log(`✅ ${index + 1}. ${rule.name}`);
        passedChecks++;
    } else {
        console.log(`❌ ${index + 1}. ${rule.name}`);
        console.log(`   描述: ${rule.description}`);
    }
});

console.log(`\n📊 检查结果: ${passedChecks}/${totalChecks} 通过\n`);

// 检查是否有冲突的深色主题规则
const conflictingRules = [
    {
        name: '深色主题输入框规则冲突',
        pattern: /\.dark\s+input[^{]*\{[^}]*background-color:[^}]*\}(?![^{]*html:not\(\.dark\))/,
        description: '检查是否有未被覆盖的深色主题输入框规则'
    }
];

console.log('检查潜在冲突:\n');

conflictingRules.forEach((rule, index) => {
    const found = rule.pattern.test(cssContent);
    if (found) {
        console.log(`⚠️  ${index + 1}. ${rule.name}`);
        console.log(`   描述: ${rule.description}`);
    } else {
        console.log(`✅ ${index + 1}. 无${rule.name}`);
    }
});

// 生成修复建议
console.log('\n💡 修复建议:\n');

if (passedChecks < totalChecks) {
    console.log('以下CSS规则可能需要添加或修正:');
    
    requiredRules.forEach((rule, index) => {
        const found = rule.pattern.test(cssContent);
        if (!found) {
            console.log(`\n${index + 1}. ${rule.name}:`);
            console.log(`   ${rule.description}`);
            
            // 提供示例CSS
            switch (rule.name) {
                case '输入框白色背景':
                    console.log('   示例CSS:');
                    console.log('   html:not(.dark) input {');
                    console.log('     background-color: #ffffff !important;');
                    console.log('     color: #1f2937 !important;');
                    console.log('   }');
                    break;
                case '蓝色信息框背景':
                    console.log('   示例CSS:');
                    console.log('   html:not(.dark) .bg-blue-50 {');
                    console.log('     background-color: #eff6ff !important;');
                    console.log('   }');
                    break;
            }
        }
    });
} else {
    console.log('🎉 所有必要的CSS规则都已正确添加！');
}

// 检查文件大小
const stats = fs.statSync(cssPath);
const fileSizeKB = (stats.size / 1024).toFixed(2);
console.log(`\n📁 CSS文件大小: ${fileSizeKB} KB`);

if (stats.size > 50000) { // 50KB
    console.log('⚠️  CSS文件较大，考虑优化');
} else {
    console.log('✅ CSS文件大小合理');
}

// 总结
console.log('\n📋 总结:');
if (passedChecks === totalChecks) {
    console.log('✅ 白色主题CSS修复验证通过');
    console.log('🎯 建议在实际应用中测试以确保所有组件正确显示');
} else {
    console.log('❌ 白色主题CSS修复需要进一步完善');
    console.log(`📝 还需要修复 ${totalChecks - passedChecks} 个问题`);
}

process.exit(passedChecks === totalChecks ? 0 : 1);