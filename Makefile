
date := $(shell date +%Y-%m-%d)
title ?= untitled
suffix := .md
post = _posts/$(date)-"$(title)"$(suffix)

.PHONY: new
new:
	@touch "$(post)"