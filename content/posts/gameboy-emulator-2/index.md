---
title: 从GameBoy看计算机系统
date: 2026-07-13
tags: ["gameboy", "模拟器"]
series: ["gamebox"]
series_order: 2
---

初代Game Boy发售的年代, 计算机科学和电子技术都还处于早期发展阶段.

从任天堂公司成立到Game Boy发布的100年间, 人类发明了电子管, 造出了第一台通用计算机, 提出了图灵机理论, 冯诺伊曼架构, 晶体管被发明出来, 集成电路变成现实, Intel发布了历史上第一款微处理器 Intel 4004, LCD显示技术开始实用化, 一系列的技术变革, 是这款游戏掌机最终能够问世的底层推动力.

当翻阅那些颇具年代感的文档, 一行一行敲出模拟器的代码时, 感觉像是在考古😂.

## 硬件规格

Game Boy(DMG)硬件规格如下:

- CPU: 8-bit, 寻址范围64KB
- 时钟频率: 4.194304 MHz
- 屏幕:
  - LCD 4.7x4.3cm
  - 分辨率: 160x144
  - 帧率: 约60fps
  - 颜色: 4 shades of green, 这是4种不同深度的绿(不是五彩斑斓的黑🤪)
- 显存: 8KB

硬件条件很简单, 甚至简陋, 但开发者们却可以用几十KB的游戏ROM化腐朽为神奇, 为这台机器注入灵魂.

## 系统架构

Game Boy是完整的计算机系统, 和现在的通用计算机相比, 在系统架构上没有本质区别:

- CPU, 存储单元, IO设备通过系统总线互联
- 存储单元保存指令和数据
- CPU在时钟驱动下不断地取指, 译码, 执行, 回写结果
- IO设备处理系统的输入和输出

{{< figure src="./imgs/gameboy-architecture.drawio.svg" caption="Game Boy系统架构" >}}

如上图, CPU自不必说, 图中的PPU相当于显卡, 负责渲染画面; APU相当于声卡, 负责生成游戏音效; 其他的IO设备包括手柄, 串口, 定时器.

和现代的计算机系统相比, 它没有PC架构中的南北桥设计, 因为大家都很慢, 就没有必要互相嫌弃了; CPU支持中断机制, 但没有多核, 没有复杂的cache系统, 缓存一致性问题在这里是不存在的; 没有复杂的时钟树配置, 所有的模块都共享一个Master Clock; 整个系统的设计简单而优雅.

CPU的寻址范围是64KB, 所有模块都可以在这个地址空间中找到自己的位置:


|Start|End|Description|Notes|
|-----|---|-----------|-----|
|0000|3FFF|16 KiB ROM bank 00|From cartridge, usually a fixed bank|
|4000|7FFF|16 KiB ROM Bank 01–NN|From cartridge, switchable bank via mapper (if any)|
|8000|9FFF|8 KiB Video RAM (VRAM)|In CGB mode, switchable bank 0/1|
|A000|BFFF|8 KiB External RAM|From cartridge, switchable bank if any|
|C000|CFFF|4 KiB Work RAM (WRAM)||
|D000|DFFF|4 KiB Work RAM (WRAM)|In CGB mode, switchable bank 1–7|
|E000|FDFF|Echo RAM (mirror of C000–DDFF)|Nintendo says use of this area is prohibited.|
|FE00|FE9F|Object attribute memory (OAM)||
|FEA0|FEFF|Not Usable|Nintendo says use of this area is prohibited.|
|FF00|FF7F|I/O Registers||
|FF80|FFFE|High RAM (HRAM)||
|FFFF|FFFF|Interrupt Enable register (IE)||


- 前面的32KB空间, 被游戏卡带的ROM占用, 用来保存指令和只读数据, 大型游戏需要的ROM可能超过32KB, 所以这里的映射是可以切换的, 同一片地址空间可以映射到卡带ROM的不同bank
- 8KB的Video RAM相当于显存, 但实际上和普通RAM没什么区别, 只不过用途比较特殊, PPU根据其中的内容渲染画面
- 8KB的External RAM来自于游戏卡带内置的RAM, 游戏开发者一般会利用这部分RAM做存档
- 其余的RAM区域用来保存游戏运行过程中的数据, HRAM通常被用来作为函数调用栈
- 系统的各种寄存器在地址空间中也有专门的映射区域, 比如游戏可以读取joypad寄存器判断按键的状态


## 模拟器实现策略

### 模拟器核心

模拟器核心本质上是一个输入输出系统, 输入是用户的按键, 输出是游戏的画面和音频数据, 它需要在处理输入输出的过程中更新自身的状态, 并始终维护好这个内部状态.

系统中的各个模块, 在统一的时钟驱动下向前推进. CPU执行指令, PPU解析显存数据并逐行渲染, APU根据寄存器配置生成音频数据, 定时器负责计数..., 彼此之间互不干扰. 模拟器核心的软件实现, 可以采用下面几种策略:

1. 完全模拟硬件行为, 时钟每次tick, 各个模块就按照各自的规则向前推进一步
2. 每个模块运行在独立的线程之中, 只在必要的时候做同步
3. CPU先执行一条指令, 其他模块根据这条指令消耗的时钟tick数, 再进行追赶

在我的实现中, 采用的是方案3, 这个方案比较好地兼顾了准确性, 性能和实现复杂度.

- 方案1, 可以最准确地还原硬件的行为, 但实现起来略微复杂
- 方案2, 理论上性能会更好, 但是多线程的方式对单核的MCU平台不够友好

所以模拟器核心代码更新状态的逻辑可以简化成下面的代码:

```c
...
    uint8_t ticks = cpu_step();
    timer_step(ticks);
    ppu_step(ticks);

    return ticks;
...
```

### 游戏主循环

以Linux平台为例, 在每一帧的开始: 

1. 模拟器核心首先调用平台代码, 获取按键输入
2. 按键的输入会作为模拟器的外部输入, 更新对应寄存器的状态
3. 模拟器核心在跑完PPU渲染一帧画面所需要的tick数之后, 游戏的画面数据已经准备好了
4. 平台代码开始绘制游戏画面, 并等待下一帧的开始, 再次进入第1步
5. 游戏结束
