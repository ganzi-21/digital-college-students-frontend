/**
 * Neo4j 数据导出脚本
 * 功能：从 Neo4j Desktop 导出技能和竞赛数据，转换为前端图谱需要的格式
 * 支持：一个技能对应多个竞赛的关系
 * 
 * 使用方法：
 * 1. 配置底部的 Neo4j 连接信息
 * 2. 运行：node server/export-neo4j-data.js
 * 3. 数据将导出到 public/knowledge-graph/data/competitions.json
 * 
 * 注意：确保 Neo4j Desktop 正在运行
 */

const neo4j = require('neo4j-driver');
const fs = require('fs');
const path = require('path');

// ============ 配置区域 ============
// Neo4j Desktop 连接信息（根据你的实际情况修改）
const NEO4J_URI = process.env.NEO4J_URI || 'bolt://localhost:7687';
const NEO4J_USER = process.env.NEO4J_USER || 'neo4j';
const NEO4J_PASSWORD = process.env.NEO4J_PASSWORD || '12345678';
// 数据库名称（Neo4j Desktop 中的数据库名）
const DATABASE_NAME = process.env.NEO4J_DATABASE || 'neo4j';

// 导出文件路径
const OUTPUT_FILE = path.join(__dirname, '..', 'public', 'knowledge-graph', 'data', 'competitions.json');

// ============ 节点标签映射 ============
// 根据你的Neo4j数据中的实际标签进行修改
const COMPETITION_LABELS = ['Competition', '竞赛', 'competition'];
const SKILL_LABELS = ['Skill', '技能', 'skill'];

// 关系类型映射
const COMPETITION_SKILL_RELATION = ['REQUIRES', 'NEEDS', 'HAS_SKILL', '需要', 'requires'];
const SKILL_COMPETITION_RELATION = ['REQUIRED_BY', 'BELONGS_TO', '属于', 'required_by'];

/**
 * 检查标签是否匹配
 */
function matchesAnyLabel(nodeLabels, targetLabels) {
    if (!nodeLabels || !Array.isArray(nodeLabels)) return false;
    return nodeLabels.some(label => targetLabels.includes(label));
}

/**
 * 检查关系类型是否匹配
 */
function matchesAnyRelation(relationType, targetTypes) {
    if (!relationType) return false;
    return targetTypes.includes(relationType);
}

/**
 * 解析节点
 */
function parseNodeResult(records, labelField = 'n') {
    const nodes = new Map();
    for (const rec of records) {
        const n = rec.get(labelField);
        if (!n) continue;
        const id = n.identity?.toString() || String(Math.random());
        const labels = n.labels || [];
        const props = n.properties || {};
        
        if (!nodes.has(id)) {
            nodes.set(id, {
                id: id,
                labels: labels,
                properties: props
            });
        }
    }
    return Array.from(nodes.values());
}

/**
 * 解析关系
 */
function parseRelationships(records) {
    const links = [];
    for (const rec of records) {
        const a = rec.get('a');
        const b = rec.get('b');
        const r = rec.get('r');
        
        if (!a || !b) continue;
        
        const sourceId = a.identity?.toString() || '';
        const targetId = b.identity?.toString() || '';
        const relType = r?.type || '';
        
        links.push({
            source: sourceId,
            target: targetId,
            type: relType,
            sourceLabels: a.labels || [],
            targetLabels: b.labels || []
        });
    }
    return links;
}

/**
 * 生成唯一ID
 */
let idCounter = 1;
function generateId(prefix = 'id') {
    return `${prefix}_${idCounter++}`;
}

/**
 * 转换数据为前端格式
 */
function transformToFrontendFormat(nodes, relationships) {
    const competitions = new Map();
    const skills = new Map();
    const skillCompetitionsMap = new Map(); // 技能 -> 竞赛的映射
    
    // 分类节点
    nodes.forEach(node => {
        const labels = node.labels;
        const props = node.properties;
        
        if (matchesAnyLabel(labels, COMPETITION_LABELS)) {
            // 竞赛节点
            const compId = props.id || props.name || generateId('C');
            competitions.set(node.id, {
                id: compId,
                name: props.name || props.title || '未命名竞赛',
                domain: props.domain || props.category || '其他',
                skills: [],
                website: props.website || props.url || '',
                description: props.description || props.desc || ''
            });
        } else if (matchesAnyLabel(labels, SKILL_LABELS)) {
            // 技能节点
            const skillId = props.id || props.name || generateId('S');
            skills.set(node.id, {
                id: skillId,
                name: props.name || props.title || '未命名技能',
                category: props.category || props.type || '其他'
            });
            
            // 初始化技能对应的竞赛列表
            if (!skillCompetitionsMap.has(skillId)) {
                skillCompetitionsMap.set(skillId, []);
            }
        }
    });
    
    // 处理关系
    relationships.forEach(rel => {
        const sourceId = rel.source;
        const targetId = rel.target;
        const sourceLabels = rel.sourceLabels;
        const targetLabels = rel.targetLabels;
        
        // 检查是否是 竞赛-技能 关系
        let competitionNode, skillNode;
        
        if (matchesAnyLabel(sourceLabels, COMPETITION_LABELS) && matchesAnyLabel(targetLabels, SKILL_LABELS)) {
            competitionNode = competitions.get(sourceId);
            skillNode = skills.get(targetId);
        } else if (matchesAnyLabel(sourceLabels, SKILL_LABELS) && matchesAnyLabel(targetLabels, COMPETITION_LABELS)) {
            competitionNode = competitions.get(targetId);
            skillNode = skills.get(sourceId);
        }
        
        if (competitionNode && skillNode) {
            // 添加技能到竞赛
            if (!competitionNode.skills.includes(skillNode.name)) {
                competitionNode.skills.push(skillNode.name);
            }
            
            // 添加竞赛到技能（支持一个技能对应多个竞赛）
            const compList = skillCompetitionsMap.get(skillNode.id) || [];
            if (!compList.includes(competitionNode.id)) {
                compList.push(competitionNode.id);
                skillCompetitionsMap.set(skillNode.id, compList);
            }
        }
    });
    
    // 构建relationships数组
    const rels = [];
    competitions.forEach((comp, neo4jId) => {
        comp.skills.forEach(skillName => {
            const skillEntry = Array.from(skills.values()).find(s => s.name === skillName);
            if (skillEntry) {
                rels.push({
                    competitionId: comp.id,
                    skillId: skillEntry.id
                });
            }
        });
    });
    
    // 为技能节点添加关联的竞赛ID列表
    const skillsArray = Array.from(skills.values()).map(skill => ({
        ...skill,
        competitions: skillCompetitionsMap.get(skill.id) || []
    }));
    
    return {
        competitions: Array.from(competitions.values()),
        skills: skillsArray,
        relationships: rels
    };
}

/**
 * 主函数
 */
async function exportData() {
    console.log('========================================');
    console.log('Neo4j 数据导出工具');
    console.log('========================================');
    console.log(`连接: ${NEO4J_URI}`);
    console.log(`数据库: ${DATABASE_NAME}`);
    console.log(`用户: ${NEO4J_USER}`);
    console.log('========================================\n');
    
    try {
        // 创建驱动
        const driver = neo4j.driver(
            NEO4J_URI,
            neo4j.auth.basic(NEO4J_USER, NEO4J_PASSWORD)
        );
        
        // 测试连接
        await driver.verifyConnectivity();
        console.log('✓ Neo4j 连接成功\n');
        
        // 创建会话
        const sessionConfig = {
            database: DATABASE_NAME,
            defaultAccessMode: neo4j.session.READ
        };
        const session = driver.session(sessionConfig);
        
        // 1. 查询所有竞赛节点
        console.log('查询竞赛节点...');
        const compQuery = `
            MATCH (n) 
            WHERE any(label IN labels(n) WHERE label IN ${JSON.stringify(COMPETITION_LABELS)})
            RETURN n
        `;
        const compResult = await session.run(compQuery);
        const competitionNodes = parseNodeResult(compResult.records, 'n');
        console.log(`  找到 ${competitionNodes.length} 个竞赛节点`);
        
        // 2. 查询所有技能节点
        console.log('查询技能节点...');
        const skillQuery = `
            MATCH (n) 
            WHERE any(label IN labels(n) WHERE label IN ${JSON.stringify(SKILL_LABELS)})
            RETURN n
        `;
        const skillResult = await session.run(skillQuery);
        const skillNodes = parseNodeResult(skillResult.records, 'n');
        console.log(`  找到 ${skillNodes.length} 个技能节点`);
        
        // 3. 查询所有竞赛-技能关系
        console.log('查询竞赛-技能关系...');
        const relQuery = `
            MATCH (a)-[r]->(b)
            WHERE (
                (any(label IN labels(a) WHERE label IN ${JSON.stringify(COMPETITION_LABELS)}) 
                 AND any(label IN labels(b) WHERE label IN ${JSON.stringify(SKILL_LABELS)}))
                OR
                (any(label IN labels(a) WHERE label IN ${JSON.stringify(SKILL_LABELS)}) 
                 AND any(label IN labels(b) WHERE label IN ${JSON.stringify(COMPETITION_LABELS)}))
            )
            RETURN a, r, b
        `;
        const relResult = await session.run(relQuery);
        const relationships = parseRelationships(relResult.records);
        console.log(`  找到 ${relationships.length} 条关系`);
        
        // 关闭会话
        await session.close();
        await driver.close();
        
        // 转换数据
        console.log('\n转换数据格式...');
        const frontendData = transformToFrontendFormat(
            [...competitionNodes, ...skillNodes],
            relationships
        );
        
        console.log(`  竞赛数量: ${frontendData.competitions.length}`);
        console.log(`  技能数量: ${frontendData.skills.length}`);
        console.log(`  关系数量: ${frontendData.relationships.length}`);
        
        // 写入文件
        console.log(`\n导出到: ${OUTPUT_FILE}`);
        
        // 确保目录存在
        const outputDir = path.dirname(OUTPUT_FILE);
        if (!fs.existsSync(outputDir)) {
            fs.mkdirSync(outputDir, { recursive: true });
        }
        
        // 格式化写入（中文友好的缩进）
        const jsonContent = JSON.stringify(frontendData, null, 2);
        fs.writeFileSync(OUTPUT_FILE, '\ufeff' + jsonContent, 'utf8'); // 添加BOM以支持中文
        
        console.log('✓ 数据导出成功！\n');
        
        // 显示摘要
        console.log('========================================');
        console.log('数据摘要');
        console.log('========================================');
        
        if (frontendData.competitions.length > 0) {
            console.log('\n竞赛列表:');
            frontendData.competitions.forEach((comp, i) => {
                console.log(`  ${i + 1}. ${comp.name} (${comp.skills.length}个技能)`);
            });
        }
        
        if (frontendData.skills.length > 0) {
            console.log('\n技能列表:');
            frontendData.skills.forEach((skill, i) => {
                console.log(`  ${i + 1}. ${skill.name} (${skill.competitions.length}个竞赛)`);
            });
        }
        
        console.log('\n========================================');
        console.log('导出完成！');
        console.log('========================================');
        
    } catch (error) {
        console.error('\n✗ 导出失败:', error.message);
        
        if (error.message.includes('Connection refused')) {
            console.log('\n请检查:');
            console.log('  1. Neo4j Desktop 是否正在运行');
            console.log('  2. 连接地址是否正确 (bolt://localhost:7687)');
            console.log('  3. 用户名和密码是否正确');
        }
        
        process.exit(1);
    }
}

// 导出示例数据（当Neo4j没有数据时使用）
function exportSampleData() {
    console.log('导出示例数据...\n');
    
    const sampleData = {
        competitions: [
            {
                id: "C001",
                name: "中国国际大学生创新大赛",
                domain: "创新创业",
                skills: ["商业策划", "PPT制作", "演讲答辩"],
                website: "https://cy.ncss.cn/",
                description: "中国国际大学生创新大赛是由教育部等十二个中央部委与省级政府联合主办的全球性创新创业赛事。"
            },
            {
                id: "C002",
                name: "挑战杯全国大学生课外学术科技作品竞赛",
                domain: "学术科技",
                skills: ["文献调研", "实验设计", "数据分析", "论文撰写"],
                website: "https://www.tiaozhanbei.net/",
                description: "挑战杯全国大学生课外学术科技作品竞赛是一项具有导向性、示范性和群众性的全国竞赛活动。"
            },
            {
                id: "C003",
                name: "ACM-ICPC国际大学生程序设计竞赛",
                domain: "计算机编程",
                skills: ["算法设计", "程序编写", "问题解决", "团队协作"],
                website: "https://icpc.global/",
                description: "ACM-ICPC国际大学生程序设计竞赛是由美国计算机协会主办的一项年度竞赛。"
            },
            {
                id: "C004",
                name: "全国大学生机器人大赛",
                domain: "机器人技术",
                skills: ["机械设计", "电子电路", "编程控制", "机器人调试"],
                website: "http://cnrobocon.net/",
                description: "全国大学生机器人大赛是一项旨在培养大学生实践能力、创新精神和团队协作能力的赛事。"
            },
            {
                id: "C005",
                name: "中国大学生计算机设计大赛",
                domain: "计算机设计",
                skills: ["计算机图形学", "图像处理", "软件开发", "交互设计"],
                website: "https://jsjds.blcu.edu.cn/index.htm",
                description: "中国大学生计算机设计大赛是我国高校面向本科生最早的赛事之一。"
            },
            {
                id: "C006",
                name: "全国大学生信息安全竞赛",
                domain: "信息安全",
                skills: ["网络安全", "密码学", "漏洞挖掘", "安全编程"],
                website: "http://www.ciscn.cn/",
                description: "全国大学生信息安全竞赛是为培养、选拔、推荐优秀信息安全专业人才。"
            }
        ],
        skills: [
            { id: "S001", name: "商业策划", category: "商业能力", competitions: ["C001"] },
            { id: "S002", name: "PPT制作", category: "办公技能", competitions: ["C001"] },
            { id: "S003", name: "演讲答辩", category: "沟通能力", competitions: ["C001"] },
            { id: "S004", name: "文献调研", category: "学术能力", competitions: ["C002"] },
            { id: "S005", name: "实验设计", category: "学术能力", competitions: ["C002"] },
            { id: "S006", name: "数据分析", category: "数据处理能力", competitions: ["C002"] },
            { id: "S007", name: "论文撰写", category: "学术能力", competitions: ["C002"] },
            { id: "S008", name: "算法设计", category: "计算机编程能力", competitions: ["C003"] },
            { id: "S009", name: "程序编写", category: "计算机编程能力", competitions: ["C003"] },
            { id: "S010", name: "问题解决", category: "综合能力", competitions: ["C003"] },
            { id: "S011", name: "团队协作", category: "综合能力", competitions: ["C003"] },
            { id: "S012", name: "机械设计", category: "工程技术能力", competitions: ["C004"] },
            { id: "S013", name: "电子电路", category: "工程技术能力", competitions: ["C004"] },
            { id: "S014", name: "编程控制", category: "计算机编程能力", competitions: ["C004"] },
            { id: "S015", name: "机器人调试", category: "工程技术能力", competitions: ["C004"] },
            { id: "S016", name: "计算机图形学", category: "计算机设计能力", competitions: ["C005"] },
            { id: "S017", name: "图像处理", category: "计算机设计能力", competitions: ["C005"] },
            { id: "S018", name: "软件开发", category: "计算机编程能力", competitions: ["C005"] },
            { id: "S019", name: "交互设计", category: "设计能力", competitions: ["C005"] },
            { id: "S020", name: "网络安全", category: "信息安全能力", competitions: ["C006"] },
            { id: "S021", name: "密码学", category: "信息安全能力", competitions: ["C006"] },
            { id: "S022", name: "漏洞挖掘", category: "信息安全能力", competitions: ["C006"] },
            { id: "S023", name: "安全编程", category: "计算机编程能力", competitions: ["C006"] }
        ],
        relationships: [
            { competitionId: "C001", skillId: "S001" },
            { competitionId: "C001", skillId: "S002" },
            { competitionId: "C001", skillId: "S003" },
            { competitionId: "C002", skillId: "S004" },
            { competitionId: "C002", skillId: "S005" },
            { competitionId: "C002", skillId: "S006" },
            { competitionId: "C002", skillId: "S007" },
            { competitionId: "C003", skillId: "S008" },
            { competitionId: "C003", skillId: "S009" },
            { competitionId: "C003", skillId: "S010" },
            { competitionId: "C003", skillId: "S011" },
            { competitionId: "C004", skillId: "S012" },
            { competitionId: "C004", skillId: "S013" },
            { competitionId: "C004", skillId: "S014" },
            { competitionId: "C004", skillId: "S015" },
            { competitionId: "C005", skillId: "S016" },
            { competitionId: "C005", skillId: "S017" },
            { competitionId: "C005", skillId: "S018" },
            { competitionId: "C005", skillId: "S019" },
            { competitionId: "C006", skillId: "S020" },
            { competitionId: "C006", skillId: "S021" },
            { competitionId: "C006", skillId: "S022" },
            { competitionId: "C006", skillId: "S023" }
        ]
    };
    
    const outputDir = path.dirname(OUTPUT_FILE);
    if (!fs.existsSync(outputDir)) {
        fs.mkdirSync(outputDir, { recursive: true });
    }
    
    const jsonContent = JSON.stringify(sampleData, null, 2);
    fs.writeFileSync(OUTPUT_FILE, '\ufeff' + jsonContent, 'utf8');
    
    console.log('✓ 示例数据导出成功！');
    console.log(`  文件: ${OUTPUT_FILE}`);
    console.log(`  竞赛: ${sampleData.competitions.length}`);
    console.log(`  技能: ${sampleData.skills.length}`);
    console.log(`  关系: ${sampleData.relationships.length}`);
}

// 解析命令行参数
const args = process.argv.slice(2);
if (args.includes('--sample')) {
    exportSampleData();
} else {
    exportData();
}
