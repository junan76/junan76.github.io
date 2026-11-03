---
title: 使用Qemu和gdb调试内核
order: 1
---

## 调试应用程序

对于操作系统内核之上的应用程序, 调试起来比较容易. 以`gdb`调试器为例, 有三种使用方式:

1. 直接启动应用程序
2. `attach`应用程序
3. 作为`client`, 连接另一个`gdb server`, 由`server`完成对应用程序的控制

::: tip
- 方式(2), 可能会遇到权限问题, 比如被调试的进程是特权进程
- 方式(3), 可以实现远程调试, CPU架构也可以不同, `gdb client`和`gdb server`之间的协议一致即可
:::

## 调试`Linux`内核

`gdb`的底层实现, 依赖内核的`ptrace`系统调用, 在调试内核的时候, 是没有`ptrace`可以调用的, 所以`gdb`不能直接对内核进行调试. 这种情况下, 目前也有三种方式可以实现对内核的调试:

1. 使用`Qemu`运行`Linux`, 并且在`Qemu`内部启动一个`gdb sever`
2. 使用`Linux`自己的`kdb/kgdb`, 相当于内核自己启动了一个`gdb server`
3. 使用`JLink`等硬件调试工具

::: tip
方式(1), (2)都是软件的解决方案, 都需要`gdb client`远程连接到`gdb server`, 区别在于`gdb server`运行在哪里.
:::


## 使用`Qemu`和`gdb`调试内核

// TODO