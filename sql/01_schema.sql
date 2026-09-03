-- ============================================================================
-- 认知障碍评估量表评分系统 —— 数据库建表脚本
-- 数据库：MySQL 8.0+   字符集：utf8mb4   引擎：InnoDB
--
-- 共 8 张表：
--   5 张核心表：sys_user（用户）、patient（患者）、scale（量表配置）、
--               assessment（测评主记录）、assessment_detail（测评详情）
--   3 张支撑表：scale_item（量表题目）、scale_option（量表选项）、
--               scale_cutoff（量表界值）
--
-- 关联关系：
--   patient 1—N assessment；scale 1—N assessment；
--   scale 1—N scale_item 1—N scale_option；scale 1—N scale_cutoff；
--   assessment 1—N assessment_detail；scale_item 1—N assessment_detail。
-- ============================================================================

-- 如需新建数据库请取消注释（库名可按需修改）：
-- CREATE DATABASE IF NOT EXISTS ad_cognition DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;
-- USE ad_cognition;

SET NAMES utf8mb4;
SET FOREIGN_KEY_CHECKS = 0;

-- ----------------------------------------------------------------------------
-- ① 用户表（系统用户：医生 / 护士 / 管理员）
-- ----------------------------------------------------------------------------
DROP TABLE IF EXISTS `sys_user`;
CREATE TABLE `sys_user` (
    `id`            BIGINT UNSIGNED NOT NULL AUTO_INCREMENT COMMENT '主键',
    `username`      VARCHAR(50)  NOT NULL                COMMENT '登录名',
    `password_hash` VARCHAR(255) NOT NULL                COMMENT '密码哈希（勿存明文）',
    `real_name`     VARCHAR(50)  DEFAULT NULL            COMMENT '真实姓名',
    `role`          VARCHAR(20)  NOT NULL DEFAULT '护士' COMMENT '角色：医生/护士/管理员',
    `phone`         VARCHAR(20)  DEFAULT NULL            COMMENT '联系电话',
    `email`         VARCHAR(100) DEFAULT NULL            COMMENT '电子邮箱',
    `status`        TINYINT      NOT NULL DEFAULT 1      COMMENT '状态：1启用 0禁用',
    `created_at`    DATETIME     NOT NULL DEFAULT CURRENT_TIMESTAMP COMMENT '创建时间',
    `updated_at`    DATETIME     NOT NULL DEFAULT CURRENT_TIMESTAMP
                                 ON UPDATE CURRENT_TIMESTAMP COMMENT '更新时间',
    PRIMARY KEY (`id`),
    UNIQUE KEY `uk_username` (`username`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci COMMENT='系统用户表';

-- ----------------------------------------------------------------------------
-- ② 患者表
-- ----------------------------------------------------------------------------
DROP TABLE IF EXISTS `patient`;
CREATE TABLE `patient` (
    `id`              BIGINT UNSIGNED NOT NULL AUTO_INCREMENT COMMENT '主键',
    `patient_no`      VARCHAR(50)  NOT NULL                COMMENT '患者编号/病历号',
    `name`            VARCHAR(50)  NOT NULL                COMMENT '姓名',
    `gender`          TINYINT      DEFAULT NULL            COMMENT '性别：1男 2女',
    `birth_date`      DATE         DEFAULT NULL            COMMENT '出生日期',
    `age`             INT          DEFAULT NULL            COMMENT '年龄（岁）',
    `id_card`         VARCHAR(18)  DEFAULT NULL            COMMENT '身份证号',
    `education_years` INT          DEFAULT NULL            COMMENT '受教育年限（界值匹配依据）',
    `education_level` VARCHAR(20)  DEFAULT NULL            COMMENT '教育程度：文盲/小学/中学/大学',
    `phone`           VARCHAR(20)  DEFAULT NULL            COMMENT '联系电话',
    `address`         VARCHAR(255) DEFAULT NULL            COMMENT '住址',
    `created_at`      DATETIME     NOT NULL DEFAULT CURRENT_TIMESTAMP COMMENT '创建时间',
    `updated_at`      DATETIME     NOT NULL DEFAULT CURRENT_TIMESTAMP
                                   ON UPDATE CURRENT_TIMESTAMP COMMENT '更新时间',
    PRIMARY KEY (`id`),
    UNIQUE KEY `uk_patient_no` (`patient_no`),
    KEY `idx_name` (`name`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci COMMENT='患者表';

-- ----------------------------------------------------------------------------
-- ③ 量表配置表（量表级元数据）
-- ----------------------------------------------------------------------------
DROP TABLE IF EXISTS `scale`;
CREATE TABLE `scale` (
    `id`           BIGINT UNSIGNED NOT NULL AUTO_INCREMENT COMMENT '主键',
    `code`         VARCHAR(30)  NOT NULL                COMMENT '量表编码：SCD_Q9/GDS/FAQ/MMSE/MOCA_B/CDR',
    `name`         VARCHAR(100) NOT NULL                COMMENT '量表中文名',
    `full_name`    VARCHAR(200) DEFAULT NULL            COMMENT '量表英文/全称',
    `version`      VARCHAR(20)  DEFAULT '1.0'           COMMENT '版本号',
    `summary`      TEXT                                  COMMENT '量表概述',
    `instruction`  TEXT                                  COMMENT '指导语',
    `scoring_type` VARCHAR(20)  NOT NULL                COMMENT '计分类型：SUM累加/ITEMIZED分项/CDR复杂',
    `score_min`    DECIMAL(6,2) DEFAULT NULL            COMMENT '理论最低分',
    `score_max`    DECIMAL(6,2) DEFAULT NULL            COMMENT '理论最高分',
    `remark`       TEXT                                  COMMENT '备注',
    `created_at`   DATETIME     NOT NULL DEFAULT CURRENT_TIMESTAMP COMMENT '创建时间',
    `updated_at`   DATETIME     NOT NULL DEFAULT CURRENT_TIMESTAMP
                                ON UPDATE CURRENT_TIMESTAMP COMMENT '更新时间',
    PRIMARY KEY (`id`),
    UNIQUE KEY `uk_code` (`code`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci COMMENT='量表配置表';

-- ----------------------------------------------------------------------------
-- ⑥ 量表题目表（支撑表）
-- ----------------------------------------------------------------------------
DROP TABLE IF EXISTS `scale_item`;
CREATE TABLE `scale_item` (
    `id`           BIGINT UNSIGNED NOT NULL AUTO_INCREMENT COMMENT '主键',
    `scale_id`     BIGINT UNSIGNED NOT NULL                COMMENT '所属量表',
    `item_code`    VARCHAR(50)  NOT NULL                   COMMENT '题目编码（量内唯一，如 MMSE_01）',
    `item_no`      INT          NOT NULL                   COMMENT '题号',
    `domain`       VARCHAR(50)  DEFAULT NULL               COMMENT '所属认知域/分项',
    `item_text`    TEXT         NOT NULL                   COMMENT '题干内容',
    `item_type`    VARCHAR(20)  DEFAULT '单选'             COMMENT '题型',
    `score_method` VARCHAR(20)  DEFAULT 'DIRECT'           COMMENT '计分方式：DIRECT/SPECIAL',
    `max_score`    DECIMAL(6,2) DEFAULT 0                  COMMENT '该题满分',
    `required`     TINYINT      DEFAULT 1                  COMMENT '是否必答：1是 0否',
    `sort_order`   INT          DEFAULT 0                  COMMENT '排序',
    `remark`       VARCHAR(255) DEFAULT NULL               COMMENT '备注（如练习不计分）',
    PRIMARY KEY (`id`),
    UNIQUE KEY `uk_scale_item` (`scale_id`, `item_code`),
    KEY `idx_scale_id` (`scale_id`),
    CONSTRAINT `fk_item_scale` FOREIGN KEY (`scale_id`) REFERENCES `scale` (`id`)
        ON DELETE CASCADE ON UPDATE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci COMMENT='量表题目表';

-- ----------------------------------------------------------------------------
-- ⑦ 量表选项表（支撑表）
-- ----------------------------------------------------------------------------
DROP TABLE IF EXISTS `scale_option`;
CREATE TABLE `scale_option` (
    `id`          BIGINT UNSIGNED NOT NULL AUTO_INCREMENT COMMENT '主键',
    `item_id`     BIGINT UNSIGNED NOT NULL                COMMENT '所属题目',
    `option_code` VARCHAR(20)  NOT NULL                   COMMENT '选项编码',
    `option_text` VARCHAR(500) DEFAULT NULL               COMMENT '选项显示文本',
    `score_value` DECIMAL(6,2) NOT NULL DEFAULT 0         COMMENT '该选项分值',
    `is_na`       TINYINT      DEFAULT 0                  COMMENT '是否 NA（不计分）：1是 0否',
    `sort_order`  INT          DEFAULT 0                  COMMENT '排序',
    PRIMARY KEY (`id`),
    KEY `idx_item_id` (`item_id`),
    CONSTRAINT `fk_option_item` FOREIGN KEY (`item_id`) REFERENCES `scale_item` (`id`)
        ON DELETE CASCADE ON UPDATE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci COMMENT='量表选项表';

-- ----------------------------------------------------------------------------
-- ⑧ 量表界值表（支撑表）
-- ----------------------------------------------------------------------------
DROP TABLE IF EXISTS `scale_cutoff`;
CREATE TABLE `scale_cutoff` (
    `id`            BIGINT UNSIGNED NOT NULL AUTO_INCREMENT COMMENT '主键',
    `scale_id`      BIGINT UNSIGNED NOT NULL                COMMENT '所属量表',
    `cutoff_type`   VARCHAR(20)  NOT NULL                   COMMENT '类型：EDUCATION教育界值/LEVEL分级',
    `group_key`     VARCHAR(50)  DEFAULT NULL               COMMENT '分组键：文盲/小学/0-4 等',
    `result_label`  VARCHAR(100) DEFAULT NULL               COMMENT '解释文字：正常/轻度抑郁 等',
    `is_abnormal`   TINYINT      DEFAULT 0                  COMMENT '是否判为异常：1是 0否',
    `edu_years_min` INT          DEFAULT NULL               COMMENT '教育年限下限（EDUCATION 用）',
    `edu_years_max` INT          DEFAULT NULL               COMMENT '教育年限上限（EDUCATION 用，NULL=无上限）',
    `min_score`     DECIMAL(6,2) DEFAULT NULL               COMMENT '总分下限（LEVEL 用）',
    `max_score`     DECIMAL(6,2) DEFAULT NULL               COMMENT '总分上限（LEVEL 用）',
    `threshold`     DECIMAL(6,2) DEFAULT NULL               COMMENT '界值分（EDUCATION 用，得分<=界值判异常）',
    `sort_order`    INT          DEFAULT 0                  COMMENT '排序',
    PRIMARY KEY (`id`),
    KEY `idx_scale_id` (`scale_id`),
    CONSTRAINT `fk_cutoff_scale` FOREIGN KEY (`scale_id`) REFERENCES `scale` (`id`)
        ON DELETE CASCADE ON UPDATE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci COMMENT='量表界值表';

-- ----------------------------------------------------------------------------
-- ④ 测评主记录表
-- ----------------------------------------------------------------------------
DROP TABLE IF EXISTS `assessment`;
CREATE TABLE `assessment` (
    `id`              BIGINT UNSIGNED NOT NULL AUTO_INCREMENT COMMENT '主键',
    `patient_id`      BIGINT UNSIGNED NOT NULL                COMMENT '患者',
    `scale_id`        BIGINT UNSIGNED NOT NULL                COMMENT '量表',
    `assessor_id`     BIGINT UNSIGNED DEFAULT NULL            COMMENT '测评者（医生/护士）',
    `assessment_date` DATETIME     DEFAULT NULL               COMMENT '测评时间',
    `total_score`     DECIMAL(6,2) DEFAULT NULL               COMMENT '总分',
    `sub_scores`      JSON         DEFAULT NULL               COMMENT '分项得分（JSON，按认知域）',
    `cutoff_group`    VARCHAR(50)  DEFAULT NULL               COMMENT '匹配到的界值分组',
    `cutoff_value`    DECIMAL(6,2) DEFAULT NULL               COMMENT '所用界值',
    `result_label`    VARCHAR(100) DEFAULT NULL               COMMENT '解释结果',
    `is_abnormal`     TINYINT      DEFAULT NULL               COMMENT '是否异常：1是 0否',
    `status`          VARCHAR(20)  DEFAULT '已完成'           COMMENT '状态：草稿/已完成',
    `remark`          TEXT                                    COMMENT '备注',
    `created_at`      DATETIME     NOT NULL DEFAULT CURRENT_TIMESTAMP COMMENT '创建时间',
    `updated_at`      DATETIME     NOT NULL DEFAULT CURRENT_TIMESTAMP
                                   ON UPDATE CURRENT_TIMESTAMP COMMENT '更新时间',
    PRIMARY KEY (`id`),
    KEY `idx_patient_id` (`patient_id`),
    KEY `idx_scale_id` (`scale_id`),
    KEY `idx_assessor_id` (`assessor_id`),
    CONSTRAINT `fk_assess_patient` FOREIGN KEY (`patient_id`) REFERENCES `patient` (`id`)
        ON DELETE CASCADE ON UPDATE CASCADE,
    CONSTRAINT `fk_assess_scale`   FOREIGN KEY (`scale_id`)   REFERENCES `scale` (`id`)
        ON DELETE CASCADE ON UPDATE CASCADE,
    CONSTRAINT `fk_assess_user`    FOREIGN KEY (`assessor_id`) REFERENCES `sys_user` (`id`)
        ON DELETE SET NULL ON UPDATE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci COMMENT='测评主记录表';

-- ----------------------------------------------------------------------------
-- ⑤ 测评详情表
-- ----------------------------------------------------------------------------
DROP TABLE IF EXISTS `assessment_detail`;
CREATE TABLE `assessment_detail` (
    `id`                 BIGINT UNSIGNED NOT NULL AUTO_INCREMENT COMMENT '主键',
    `assessment_id`      BIGINT UNSIGNED NOT NULL                COMMENT '所属测评',
    `item_id`            BIGINT UNSIGNED DEFAULT NULL            COMMENT '题目（scale_item.id）',
    `item_code`          VARCHAR(50)  DEFAULT NULL               COMMENT '题目编码（冗余便于追溯）',
    `answer_value`       VARCHAR(50)  DEFAULT NULL               COMMENT '原始作答值',
    `selected_option_id` BIGINT UNSIGNED DEFAULT NULL            COMMENT '选中的选项（scale_option.id）',
    `item_score`         DECIMAL(6,2) DEFAULT NULL               COMMENT '该题得分',
    `created_at`         DATETIME     NOT NULL DEFAULT CURRENT_TIMESTAMP COMMENT '创建时间',
    PRIMARY KEY (`id`),
    KEY `idx_assessment_id` (`assessment_id`),
    KEY `idx_item_id` (`item_id`),
    CONSTRAINT `fk_detail_assessment` FOREIGN KEY (`assessment_id`) REFERENCES `assessment` (`id`)
        ON DELETE CASCADE ON UPDATE CASCADE,
    CONSTRAINT `fk_detail_item`       FOREIGN KEY (`item_id`)       REFERENCES `scale_item` (`id`)
        ON DELETE SET NULL ON UPDATE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci COMMENT='测评详情表';

SET FOREIGN_KEY_CHECKS = 1;
