---
pubDatetime: 2025-02-01T15:22:00Z
modDatetime: 2025-02-01T16:52:45.934Z
title: Linux HID设备驱动(1)
featured: false
draft: false
tags:
  - linux
  - HID
  - 设备驱动
description:
  当键盘上的某个按键被按下, 内核是如何感知到的? 又是如何通知用户态的进程的呢? 本系列文章会探讨linux内核中的HID设备驱动, 以及其他和HID设备相关的主题.
---

## 1. 什么是HID

HID, 即Human Interface Device, 是一类IO设备, 主要的作用是帮助人类和计算机进行交互. 常用的HID设备包括的鼠标, 键盘, 以及游戏手柄等.

HID设备通常会使用某种通信总线和计算机连接, 最常见的是USB总线, 除此之外还可以使用I2C, SPI, Bluetooth等, 具体可以参考[*这里*](https://en.wikipedia.org/wiki/Human_interface_device#Other_protocols_using_HID).

不同厂商生产的HID设备, 都需要遵循一套共同的[*标准*](https://www.usb.org/document-library/device-class-definition-hid-111), 这也方便了HID驱动的软件实现. 在linux中, 对于常见的USB鼠标键盘等设备, 通常只需要一套驱动代码就可以处理.

## 2. HID驱动架构

HID驱动在linux内核中并不是孤立存在的, 它想要正常工作, 需要内核中其他子系统的配合. 和其他成熟的软件工程项目一样, HID驱动的架构也采用了"*分层化, 模块化*"的设计思路.

以常用的USB键盘为例, 当向系统中插入键盘时:

1. USB hub首先感知到新设备的加入, hub的驱动代码创建对应的设备, 并加入到USB总线中;

2. 新加入的USB设备, 会匹配到`usbhid`驱动模块;

3. `usbhid`执行`probe`, 创建一个`HID`设备, 并注册到系统中;

4. 新加入的`HID`设备, 一般会匹配到`hid-generic`驱动模块;

5. `hid-generic`执行`probe`, 继续向上层的`input`子系统注册`input_dev`;

经过一层一层的的抽象, 上层应用已经不再关心数据是怎样通过USB总线传递过来的了, 最初的USB设备还在, 但上层应用只需要理解抽象的`input_dev`即可, USB设备驱动只需要处理好底层的数据传输, 我们甚至可以把真实的USB设备替换成软件模拟的虚拟设备.

在[*内核文档*](https://docs.kernel.org/hid/hid-transport.html)中, 对HID驱动架构有专门的描述, 如下图所示:

```text
+-----------+  +-----------+            +-----------+  +-----------+
| Device #1 |  | Device #i |            | Device #j |  | Device #k |
+-----------+  +-----------+            +-----------+  +-----------+
         \\      //                              \\      //
       +------------+                          +------------+
       | I/O Driver |                          | I/O Driver |
       +------------+                          +------------+
             ||                                      ||
    +------------------+                    +------------------+
    | Transport Driver |                    | Transport Driver |
    +------------------+                    +------------------+
                      \___                ___/
                          \              /
                         +----------------+
                         |    HID Core    |
                         +----------------+
                          /  |        |  \
                         /   |        |   \
            ____________/    |        |    \_________________
           /                 |        |                      \
          /                  |        |                       \
+----------------+  +-----------+  +------------------+  +------------------+
| Generic Driver |  | MT Driver |  | Custom Driver #1 |  | Custom Driver #2 |
+----------------+  +-----------+  +------------------+  +------------------+

Example Drivers:
  I/O: USB, I2C, Bluetooth-l2cap
  Transport: USB-HID, I2C-HID, BT-HIDP
```

如果有新类型的IO Driver和Transport Driver需要支持, 可以很方便的添加到系统中; 在HID Core这一层内部, 实际上包含很多具有特定功能的模块, 比如`hidraw`, 可以让用户进程直接读取处理设备上报的原始数据, 或者通过向设备文件写入数据直接操作底层设备; 恰到好处的抽象, 合理的分层, 模块化, 让这部分代码具有很好的可维护性.