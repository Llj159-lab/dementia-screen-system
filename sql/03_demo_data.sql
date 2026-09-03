-- ============================================================================
-- 认知障碍评估量表评分系统 —— 演示数据（用户 / 患者 / 测评记录）
-- 需先执行 01_schema.sql 与 02_seed_data.sql。
-- 说明：password_hash 为占位符，正式环境请用安全哈希（如 bcrypt）。
-- ============================================================================
SET NAMES utf8mb4;
START TRANSACTION;

-- ----------------------------------------------------------------------------
-- 用户
-- ----------------------------------------------------------------------------
INSERT INTO `sys_user` (`id`,`username`,`password_hash`,`real_name`,`role`,`phone`,`status`) VALUES
(1, 'admin',   'placeholder_hash_admin',   '系统管理员', '管理员', '13800000000', 1),
(2, 'doctor1', 'placeholder_hash_doctor1', '张医生',     '医生',   '13800000001', 1),
(3, 'nurse1',  'placeholder_hash_nurse1',  '李护士',     '护士',   '13800000002', 1);

-- ----------------------------------------------------------------------------
-- 患者
-- ----------------------------------------------------------------------------
INSERT INTO `patient` (`id`,`patient_no`,`name`,`gender`,`birth_date`,`age`,`education_years`,`education_level`,`phone`) VALUES
(1, 'P0001', '王某某', 1, '1955-03-12', 71, 9,  '中学', '13900000001'),
(2, 'P0002', '赵某某', 2, '1960-07-20', 66, 16, '大学', '13900000002');

-- ----------------------------------------------------------------------------
-- 测评 1：MMSE（患者 1，受教育 9 年 → 中学及以上，界值 24；满分 30，判正常）
-- ----------------------------------------------------------------------------
INSERT INTO `assessment`
(`id`,`patient_id`,`scale_id`,`assessor_id`,`assessment_date`,`total_score`,`sub_scores`,
 `cutoff_group`,`cutoff_value`,`result_label`,`is_abnormal`,`status`)
VALUES
(1, 1, 4, 2, '2026-09-02 10:00:00', 30.0,
 '{"时间定向":5,"地点定向":5,"即刻记忆":3,"注意与计算":5,"延迟回忆":3,"命名":2,"复述":1,"阅读理解":1,"三步指令":3,"书写":1,"视空间":1}',
 '中学及以上', 24.0, '中学及以上（>6 年）', 0, '已完成');

-- 30 道题全部回答正确
INSERT INTO `assessment_detail` (`assessment_id`,`item_id`,`item_code`,`answer_value`,`item_score`)
SELECT 1, si.id, si.item_code, '1', 1.0
FROM `scale_item` si WHERE si.scale_id = 4;

-- ----------------------------------------------------------------------------
-- 测评 2：GDS（患者 2，全部回答「是」→ 反序题 0 分 + 正序题 10 分 = 10，中度抑郁）
-- ----------------------------------------------------------------------------
INSERT INTO `assessment`
(`id`,`patient_id`,`scale_id`,`assessor_id`,`assessment_date`,`total_score`,
 `cutoff_group`,`cutoff_value`,`result_label`,`is_abnormal`,`status`)
VALUES
(2, 2, 2, 3, '2026-09-02 11:00:00', 10.0, '9-11', 11.0, '中度抑郁', 0, '已完成');

INSERT INTO `assessment_detail` (`assessment_id`,`item_id`,`item_code`,`answer_value`,`item_score`)
SELECT 2, si.id, si.item_code, '是',
       CASE WHEN si.item_code IN ('GDS_01','GDS_05','GDS_07','GDS_11','GDS_13') THEN 0.0 ELSE 1.0 END
FROM `scale_item` si WHERE si.scale_id = 2;

COMMIT;
