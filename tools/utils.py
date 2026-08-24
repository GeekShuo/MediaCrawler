# -*- coding: utf-8 -*-
# Copyright (c) 2025 relakkes@gmail.com
#
# This file is part of MediaCrawler project.
# Repository: https://github.com/NanmiCoder/MediaCrawler/blob/main/tools/utils.py
# GitHub: https://github.com/NanmiCoder
# Licensed under NON-COMMERCIAL LEARNING LICENSE 1.1
#

# 声明：本代码仅供学习和研究目的使用。使用者应遵守以下原则：
# 1. 不得用于任何商业用途。
# 2. 使用时应遵守目标平台的使用条款和robots.txt规则。
# 3. 不得进行大规模爬取或对平台造成运营干扰。
# 4. 应合理控制请求频率，避免给目标平台带来不必要的负担。
# 5. 不得用于任何非法或不当的用途。
#
# 详细许可条款请参阅项目根目录下的LICENSE文件。
# 使用本代码即表示您同意遵守上述原则和LICENSE中的所有条款。


import argparse
import logging

from .crawler_util import *
from .slider_util import *
from .time_util import *


def init_loging_config():
    level = logging.INFO
    logging.basicConfig(
        level=level,
        format="%(asctime)s %(name)s %(levelname)s (%(filename)s:%(lineno)d) - %(message)s",
        datefmt='%Y-%m-%d %H:%M:%S'
    )
    _logger = logging.getLogger("MediaCrawler")
    _logger.setLevel(level)

    # Disable httpx INFO level logs
    logging.getLogger("httpx").setLevel(logging.WARNING)

    return _logger


logger = init_loging_config()

def str2bool(v):
    if isinstance(v, bool):
        return v
    if v.lower() in ('yes', 'true', 't', 'y', '1'):
        return True
    elif v.lower() in ('no', 'false', 'f', 'n', '0'):
        return False
    else:
        raise argparse.ArgumentTypeError('Boolean value expected.')


# ==================== 反检测：拟人化行为（video_kb patch） ====================

async def human_sleep(base_sec: float = 2.0) -> float:
    """拟人化随机等待，替代固定间隔（固定节奏是最明显的行为指纹）。

    - 基础值 base_sec，实际等待 uniform(base, base*2.5)
    - 约 8% 概率追加 8~20s 长停顿（模拟真人走神/看内容）
    返回实际等待秒数（便于日志）。
    """
    import asyncio as _a
    import random as _r
    sec = _r.uniform(base_sec, base_sec * 2.5)
    if _r.random() < 0.08:
        sec += _r.uniform(8.0, 20.0)
    await _a.sleep(sec)
    return sec


async def simulate_human_browsing(page, rounds: int = 2) -> None:
    """在页面做少量鼠标移动+滚动，模拟真人浏览行为。

    纯 API 连打而页面毫无交互是典型爬虫特征；签名本就跑在 page
    上下文里，补一点浏览行为可显著降低行为风控命中率。
    失败静默忽略（不影响主流程）。
    """
    import asyncio as _a
    import random as _r
    try:
        for _ in range(rounds):
            await page.mouse.move(_r.randint(200, 1200), _r.randint(200, 700),
                                  steps=_r.randint(5, 15))
            await page.mouse.wheel(0, _r.randint(300, 900))
            await _a.sleep(_r.uniform(0.6, 1.8))
        await page.mouse.wheel(0, -_r.randint(200, 500))
    except Exception as e:
        logger.warning(f"[anti-detect] simulate_human_browsing: {e}")


def random_viewport() -> dict:
    """从常见真实分辨率中随机取一个视口，避免固定 1920x1080 指纹。"""
    import random as _r
    w, h = _r.choice([
        (1920, 1080), (1536, 864), (1440, 900),
        (1680, 1050), (1600, 900), (1512, 982),
    ])
    return {"width": w, "height": h}
