package com.example.civic_sense;

import org.springframework.boot.SpringApplication;
import org.springframework.boot.autoconfigure.SpringBootApplication;
import org.springframework.scheduling.annotation.EnableScheduling;

@SpringBootApplication
@EnableScheduling
public class CivicSenseApplication {

    public static void main(String[] args) {
        SpringApplication.run(CivicSenseApplication.class, args);
    }

}