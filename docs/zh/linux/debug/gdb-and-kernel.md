---
title: qemu+gdb调试内核
order: 1
---

## 如何调试应用程序

对于操作系统内核之上的应用程序, 调试起来比较容易. 以`gdb`调试器为例, 有三种使用方式:

1. `gdb`直接启动应用程序
2. `gdb attach`应用程序
3. `gdb`作为`client`, 连接另一个`gdb server`, 由`server`完成对应用程序的控制

::: note
- 方式(2), 可能会遇到权限问题, 比如被调试的进程是特权进程
- 方式(3), 可以实现远程调试, CPU架构也可以不同, `gdb client`和`gdb server`之间的协议一致即可
:::

## 如何调试`Linux`内核

`gdb`的底层实现, 依赖内核的`ptrace`系统调用, 在调试内核的时候, 是没有`ptrace`可以调用的, 所以`gdb`不能直接对内核进行调试. 对于这种情况, 也有三种调试方案:

1. 使用`Qemu`运行`Linux`, 并且在`Qemu`内部启动一个`gdb sever`
2. 使用`Linux`自己的`kdb/kgdb`, 相当于内核自己启动了一个`gdb server`
3. 使用`JLink`等硬件调试工具

::: note
方式(1), (2)都是软件的解决方案, 都需要`gdb client`远程连接到`gdb server`, 区别在于`gdb server`运行在哪里.
:::


## 使用`Qemu`和`gdb`调试内核

### 编译内核

以arm64架构的内核为例, 需要额外开启和调试相关的配置选项, 构建完成之后得到:

```shell
$ # 用于调试
$ file vmlinux
vmlinux: ELF 64-bit LSB pie executable, ARM aarch64, version 1 (SYSV), statically linked, BuildID[sha1]=8b1b3521331d4c1139017046c51edb3137c0fea0, with debug_info, not stripped
$ # 用于Qemu启动
$ file arch/arm64/boot/Image.gz
arch/arm64/boot/Image.gz: gzip compressed data, max compression, from Unix, original size modulo 2^32 40565248
```

### 准备initramfs

基于busybox构建和制作initramfs的方法如下:

```shell
$ # 构建
$ CROSS_COMPILE=aarch64-none-linux-gnu- make -j$(nproc)
$
$ # 安装
$ CROSS_COMPILE=aarch64-none-linux-gnu- make -j$(nproc) install
$
$ # 制作initramfs
$ cd _install/ && find . | cpio -H newc -o | gzip > ../initramfs.cpio.gz
```

另外需要注意:

::: note
- 可以使用busybox的[最新稳定版本](https://www.busybox.net/downloads/), 或者[github镜像](https://github.com/vda-linux/busybox_mirror.git)
- 不要使用发行版提供的编译工具链, 可能缺少头文件, 推荐使用ARM等公司提供的第三方工具链
- 在menuconfig中配置为静态编译, 这样可以避免从工具链拷贝动态链接库
:::

### 启动内核

```shell
$ qemu-system-aarch64 -M virt -cpu cortex-a72 \
    -m 4G -kernel arch/arm64/boot/Image.gz \
    -initrd ../busybox/initramfs.cpio.gz \
    -append "rdinit=/bin/sh nokaslr" -nographic -S -s
```

其中`-S -s`的参数含义如下"

```shell
$ # 暂停CPU
$ qemu-system-aarch64 -h | grep "\-S "
-S              freeze CPU at startup (use 'c' to start execution)
                the guest without waiting for gdb to connect; use -S too
$ # 监听1234端口, 等待gdb连接
$ qemu-system-aarch64 -h | grep "\-s "
-s              shorthand for -gdb tcp::1234
```

::: info
`nokaslr`启动参数很重要, 决定了断点是否能够命中.
:::

出于安全原因, 内核会对自己的虚拟地址空间布局进行某种随即化处理, 如果没有这个参数, 内核中各个符号的地址会和`ELF`中的记录不一致, 导致`gdb`断点失效. 如果不想启用这个参数, 可以关闭`KASLR`相关配置选项.

### 开始调试

使用支持arm64架构的`gdb`, 加载内核的`ELF`文件, 获取其中的符号信息, 之后连接`gdb server`并设置断点:

```shell
$ aarch64-none-linux-gnu-gdb vmlinux
$ ...
For help, type "help".
Type "apropos word" to search for commands related to "word"...
Reading symbols from vmlinux...
(gdb) target remote :1234
Remote debugging using :1234
0x0000000040000000 in ?? ()
(gdb) b start_kernel
Breakpoint 1 at 0xffff800081ea07e0: file init/main.c, line 1046.
(gdb) c
Continuing.

Breakpoint 1, start_kernel () at init/main.c:1046
1046		char *command_line;
(gdb) 
```

至此, 已经可以对内核进行源码级别的调试了. Happy hacking! :tada: