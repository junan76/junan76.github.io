---
title: 手写一个GameBoy模拟器
date: 2026-07-12
tags: ["gameboy", "模拟器"]
series: ["gamebox"]
series_order: 1
---

## 为什么要手写一个模拟器🤔

{{< typeit loop=true >}}
>> What I cannot create, I do not understand.
{{< /typeit >}}

1889年, 日本京都, 任天堂公司成立. 成立之后的很长一段时间, 公司的主要产品都是纸牌和玩具, 虽然也尝试过其他一些业务方向, 但还没有踏入电子游戏领域, 那时白炽灯进入日常生活也不过才10年而以, 第一台通用的电子计算机还没有诞生.

一百年后, 1989年4月21日, 初代Game Boy掌机在日本首发, 同年在欧美发售. 截至2008年停产, Game Boy全系列产品的销量超过2亿台.

作为一款游戏掌机, Game Boy无疑是成功的, 但比起它在商业上的成功, 更让我惊叹的是, 在硬件资源如此紧张的系统上, 当时的前辈竟然可以开发出众多经典的游戏. 对于程序员来说, 致敬经典最好的方式, 当然是亲手实现它了, 所以我就动手实现了一个Game Boy模拟器.

Game Boy虽然只是一台游戏掌机, 但同样是一个完整的计算机系统, 用模拟器的方式去复现他的完整运行逻辑, 可以更深刻地理解计算机程序是如何运行的, 这也是我开发这个项目的另一个原因.

{{< github repo="junan76/gamebox" showThumbnail=true >}}

## 设计目标和最新进展

目前已经存在很多知名的开源Game Boy模拟器项目了, 比如:

- [mGBA](https://github.com/mgba-emu/mgba)
- [SameBoy](https://github.com/LIJI32/SameBoy)
- [Gearboy](https://github.com/drhelius/Gearboy)

[RetroArch](https://www.retroarch.com/)项目更是将众多的开源模拟器整合到一起, 让玩家可以在PC上体验曾经的快乐.

我的目标是实现一款跨平台的Game Boy模拟器. 除了支持PC端, 也可以在STM32, RP2040, ESP32等嵌入式MCU平台上运行, 新设计的板子可以简单地增加一个硬件配置文件, 就能够编译生成对应的固件.

为了达到这个目标, 在我的实现中: 
1. 模拟器核心代码被设计成平台无关的, 他的主要职责是接收按键输入, 执行指令, 更新内部模块的状态, 最后产生游戏画面和音频数据
2. 底层的平台代码, 被抽象出了几个通用的接口, 未来方便向各种MCU平台移植

当前模拟器核心代码已经完成, 并且适配了Linux平台, 下面是一些经典游戏在我的模拟器上的运行效果:

{{< gallery >}}
  {{< figure src="./imgs/tetris.gif" caption="Tetris" figureClass="grid-w33" >}}
  {{< figure src="./imgs/donkey-kong.gif" caption="Donkey Kong" figureClass="grid-w33" >}}
  {{< figure src="./imgs/super-mario.gif" caption="Super Mario Land" figureClass="grid-w33" >}}
{{< /gallery >}}

## 参考资料

任天堂为游戏开发者提供了必要的技术文档, 但对于模拟器开发来说, 这是不够的. 幸运的是, 早期玩家从1995年开始发起了一个文档项目**pandocs**, 用来解释说明Game Boy硬件的各种行为, 这也是我的模拟器项目的主要参考资料.

1. [gameboy模拟器开发的圣经**pandocs**, 比任天堂官方文档更完整.](https://gbdev.io/pandocs/)
2. [gameboy完全技术手册.](https://gekkio.fi/files/gb-docs/gbctr.pdf)
3. [gameboy的指令表.](https://gbdev.io/gb-opcodes/optables/)

> 如果你对这个项目感兴趣, 欢迎参与贡献🥳. 但AI生成的💩我是拒绝的:P