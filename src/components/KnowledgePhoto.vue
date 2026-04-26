<template>
  <div class="knowledge-photo">
    <div class="section-title-wrap">
      <Star class="title-icon" />
      <h2 class="section-title">厚积薄发</h2>
      <span class="view-more-container">
        <a href="#" class="view-more">查看更多-></a>
      </span>
    </div>

    <div class="knowledge-content">
      <p class="graph-summary">
        技能图谱帮助你梳理核心能力，学习路径图谱指引成长方向，闪卡图谱辅助高效记忆，三张图谱协同打造更清晰、更高效的学习闭环。
      </p>

      <div class="graph-layout" ref="knowledgeLeftPart">
        <div class="graph-main animate__animated" ref="knowledgeRightPart">
          <div class="graph-card graph-card--large">
            <div class="graph-frame-wrap graph-frame-wrap--skill">
              <iframe
                src="/knowledge-graph/index.html"
                class="graph-iframe graph-iframe--skill"
                frameborder="0"
                scrolling="no"
                title="技能图谱"
              ></iframe>
            </div>
          </div>
        </div>
      </div>
    </div>
  </div>
</template>

<script setup>
import { ref } from "vue";
import Star from "./Star.vue";

const knowledgeLeftPart = ref(null);
const knowledgeRightPart = ref(null);

defineExpose({
  knowledgeLeftPart,
  knowledgeRightPart
});
</script>

<style scoped>
.knowledge-photo {
  width: 100%;
  min-height: 600px;
  position: relative;
  padding: 30px 40px 60px 0;
}

.section-title-wrap {
  position: relative;
  z-index: 4;
  display: flex;
  align-items: center;
  gap: 12px;
  max-width: 1400px;
}

.title-icon {
  width: 100px;
  height: 100px;
  transform: translateY(2px);
}

.section-title {
  font-size: 32px;
  font-weight: 700;
  color: #2c3e50;
  margin: 0;
  text-shadow: 2px 2px 4px rgba(255, 255, 255, 0.8);
}

.view-more-container {
  position: absolute;
  right: 0;
}

.view-more {
  font-size: 16px;
  color: #b8a0c8;
  text-decoration: none;
  transition: all 0.3s ease;
  padding: 8px 16px;
  border-radius: 20px;
}

.view-more:hover {
  color: #9575b5;
  background: rgba(184, 160, 200, 0.1);
}

.knowledge-content {
  position: relative;
  z-index: 3;
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 24px;
  max-width: 1500px;
  margin: 0 auto;
  padding: 0 40px;
}

.graph-summary {
  width: 80%;
  margin: 0;
  padding: 14px 22px;
  border-radius: 18px;
  background: rgba(255, 255, 255, 0.7);
  border: 1px solid rgba(149, 117, 181, 0.22);
  box-shadow: 0 8px 24px rgba(149, 117, 181, 0.08);
  color: #4a5568;
  font-size: 16px;
  line-height: 1.8;
  text-align: center;
  white-space: nowrap;
}

.graph-layout {
  display: flex;
  justify-content: center;
  align-items: stretch;
  width: 100%;
}

.graph-main {
  flex: 0 0 80%;
  max-width: 80%;
}

.graph-card {
  display: flex;
  flex-direction: column;
  overflow: hidden;
  border: 2px solid rgba(149, 117, 181, 0.3);
  border-radius: 16px;
  background: rgba(255, 255, 255, 0.82);
  box-shadow: 0 10px 30px rgba(149, 117, 181, 0.15);
}

.graph-card--large {
  height: 620px;
}

.graph-frame-wrap {
  position: relative;
  flex: 1;
  overflow: hidden;
  background: #f8fafc;
}

.graph-frame-wrap--skill {
  background-position: center;
}

.graph-frame-wrap--side {
  background-position: center;
}

.graph-iframe {
  width: 100%;
  height: 100%;
  border: none;
  display: block;
  background: rgba(255, 255, 255, 0.75);
}

.graph-iframe--skill {
  width: 100%;
  height: 100%;
  margin-top: 0;
  margin-left: 0;
  transform: none;
  transform-origin: center center;
}

@media (max-width: 1280px) {
  .graph-main {
    flex: 0 0 88%;
    max-width: 88%;
  }

  .graph-card--large {
    height: 560px;
  }

  .graph-summary {
    font-size: 15px;
  }
}

@media (max-width: 1024px) {
  .knowledge-content {
    gap: 24px;
    padding: 0 20px;
  }

  .graph-layout {
    flex-direction: column;
  }

  .graph-main,
  .graph-side {
    flex: 0 0 100%;
    max-width: 100%;
    width: 100%;
  }

  .graph-card--large {
    height: 500px;
  }

  .graph-summary {
    white-space: normal;
    font-size: 15px;
  }
}

@media (max-width: 768px) {
  .knowledge-photo {
    padding: 40px 20px;
  }

  .graph-card--large {
    height: 420px;
  }

  .graph-summary {
    padding: 12px 16px;
    font-size: 14px;
    line-height: 1.7;
    text-align: left;
  }
}
</style>
