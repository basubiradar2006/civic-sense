package com.example.civic_sense.controller;

import org.springframework.stereotype.Controller;
import org.springframework.web.bind.annotation.GetMapping;

@Controller
public class FrontendController {

    @GetMapping(value = {"/", "/login", "/register", "/citizen", "/officer", "/contractor", "/complaint"})
    public String frontend() {
        return "forward:/index.html";
    }
}