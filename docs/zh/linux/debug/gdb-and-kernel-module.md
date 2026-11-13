---
title: gdb + QEMU 调试内核模块
order: 2
---

> 以 arm 架构上的 libcomposite 模块为例, 说明如何使用 QEMU + gdb 调试内核模块.

libcomposite 是 usb gadget 子系统的核心模块,  他可以把支持 USB OTG 功能的设备, "伪装"成网卡, 串口, U盘, 摄像头等设备. 用户通过 configfs 可以配置这些设备的具体参数, 详细使用方法, 参考[内核文档](https://docs.kernel.org/usb/gadget_configfs.html).

## 内核模块调试原理

内核中的大多数设备驱动或者子系统, 都可以被编译成模块的形式, 避免了内核二进制文件大小的快速膨胀; 内核模块支持动态加载和移除, 方便使用的同时也给调试带来了一些小问题:

:::note
1. 模块的加载地址是不确定的. 模块属于可重定位文件, 本身的基地址是 0, 但加载地址由内核本身决定
2. 模块的调试信息不在 vmlinux 文件中, 需要手动加载
:::

以上两个问题, 会影响 gdb 设置断点:

:::note
1. 如果地址不正确, gdb 设置断点的位置自然也是错误的
2. 没有调试信息, gdb 就无法获取函数或者其他符号的地址, 不能通过符号名设置断点
:::

解决方案如下:

:::note
1. 内核模块加载之后, 可以通过 sysfs 文件系统查看各个 section 的地址
2. gdb 本身支持加载额外的调试信息
3. 借助内核生成的 gdb 脚本加载模块的调试信息
:::

调试内核模块的原理:

:::tip
*insmod 一个模块之后, 代码段数据段等信息已经加载到内存中了, gdb需要确切知道加载到哪个地址了, 然后才能根据这个偏移计算出每个符号的真实地址, 并且正确设置断点.*
:::

## 内核配置

需要额外开启的内核配置, 主要包括4项:

1. 开启 libcomposite 模块
2. 开启 nfs 文件系统实现
3. 开启 nfs 挂载根文件系统支持
4. 开启调试支持, 并生成 gdb scripts

为了避免每次都需要重新制作 rootfs 的麻烦, 使用 nfs 作为根文件系统, 因此需要开启 nfs 相关的内核配置.


## 开启 nfs 服务

以 fedora 为例, 除了启用 nfs 服务, 还需要配置 SELinux 和防火墙. SELinux 影响文件的读写权限, 防火墙决定某个网络服务能否被正常访问:

```shell
$ sudo setenforce 0
$ firewall-cmd --list-services 
dhcpv6-client mountd nfs rpc-bind samba-client ssh
```

除 nfs 之外, mountd, rpc-bind 也需要加入到防火墙允许的 services 列表中.

## 启动系统

```shell
$ sudo qemu-system-arm -M virt \
    -kernel arch/arm/boot/zImage \
    -append "console=ttyAMA0 init=/init root=/dev/nfs \
    nfsroot=10.0.2.2:/usr/src/busybox/_install \
    nfsrootdebug ip=10.0.2.15:10.0.2.2::255.255.255.0" \
    -netdev tap,id=net0,script=./tap0-up -device e1000,netdev=net0 \
    -nographic -S -s
```

nfs 相关的内核启动参数, 指定了 nfs 服务器和客户端的 ip 地址, 根文件系统路径等配置, 详细配置方法参考[内核文档](https://docs.kernel.org/admin-guide/nfs/nfsroot.html).

这里的 guest 系统, 是通过 tap 网络设备, 连接到 host 机器上的 nfs 服务的. 在启动 guest 系统时, QEMU 需要通过一个脚本配置他创建的 tap设备:

```shell
$ cat tap0-up 
#!/bin/bash
set -eu
tap_if=${1:?tap interface NOT FOUND}

ip addr replace 10.0.2.2/24 dev ${tap_if}
ip link set dev ${tap_if} up
```

脚本配置了 tap 设备的 ip 地址之后, 启动该设备, 必须保证 ip 地址和启动参数中的设置一致.

## 启动 gdb

为了执行 gdb 脚本, 需要构建 gdb 时开启 python 支持, 所以我们需要使用 ARM 官方工具链中的arm-none-linux-gnueabihf-gdb-py:

```shell
$ arm-none-linux-gnueabihf-gdb-py vmlinux
...
(gdb) show configuration 
This GDB was configured as follows:
   configure --host=x86_64-pc-linux-gnu --target=arm-none-linux-gnueabihf
	     --enable-targets=arm-none-eabi,arm-none-linux-gnueabihf,armeb-none-eabi,
         ...
	     --with-python=/home/dgboter/venv (relocatable)
	     --with-python-libdir=/home/dgboter/venv/lib (relocatable)
(gdb) target remote :1234
```

## 加载调试信息

1. **使用内核生成的 gdb 脚本:**

```shell
$ file vmlinux-gdb.py 
vmlinux-gdb.py: symbolic link to /usr/src/linux/scripts/gdb/vmlinux-gdb.py

(gdb) lx-symbols
loading vmlinux
scanning for modules in /usr/src/linux
loading @0xbf000000: /usr/src/linux/drivers/usb/gadget/libcomposite.ko
```

`lx-symbols` 会扫描已经加载的模块, 自动定位到对应的 .ko 文件, 加载文件中的调试信息, 并且不需要指定模块加载地址; 除此之外, 内核还提供了其他 `lx-` 系列的命令和函数, 参考[内核文档](https://docs.kernel.org/process/debugging/gdb-kernel-debugging.html).

2. **使用 gdb 本身提供的命令:**

```shell
(gdb) add-symbol-file drivers/usb/gadget/libcomposite.ko 0xbf000000
add symbol table from file "drivers/usb/gadget/libcomposite.ko" at
	.text_addr = 0xbf000000
(y or n) y
Reading symbols from drivers/usb/gadget/libcomposite.ko...
```

add-symbol-file 可以加载除 vmlinux 之外的调试信息, 但需要知道模块加载的地址, 可以在 sysfs 中查看:

``` shell
/sys/kernel/config/usb_gadget # cat /sys/module/libcomposite/sections/.text 
0xbf000000
# 也可以使用 lsmod 查看
/sys/kernel/config/usb_gadget # lsmod
libcomposite 49152 2 - Live 0xbf000000
```

:::note
gdb 中的其他相关命令:
- symbol-file: 加载符号信息, 但原来的符号信息会被抹除
- file: 更改被调试的文件, 同时会加载新文件的符号信息
- load: 加载文件到目标内存, 已经使用modprobe加载内核模块了, 所以不需要使用 load
:::

## 触发断点

符号信息已经正确加载了, 断点可以正常设置了. 当在 guest 系统的 configfs 创建一个 gadget 时, 会触发设置好的断点:

```shell
# 设置断点
(gdb) b gadgets_make
Breakpoint 1 at 0xbf0066b0: file ./include/linux/slab.h, line 991.

# 在 guest 系统中执行
/sys/kernel/config/usb_gadget # mkdir g1

# 断点命中
Breakpoint 1, gadgets_make (group=0xbf00903c <gadget_subsys>, name=0xc897ded0 "g1") at drivers/usb/gadget/configfs.c:1994
1994		gi = kzalloc_obj(*gi);
(gdb) n
1995		if (!gi)
(gdb) p gi
$3 = (struct gadget_info *) 0xc2469000

```

---

至此, 已经可以对内核模块进行源码级调试了. Happy hacking! :tada: