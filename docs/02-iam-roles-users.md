# Session 2: IAM Roles and Users 🛡️

## **Introduction** 🧠

Choosing between IAM Roles and IAM Users is one of the most critical security decisions in AWS, but also one of the most misunderstood. **AWS strongly recommends using IAM Roles as the default, reserving IAM Users only for specific cases**. This fundamental paradigm shift can significantly reduce security risk and improve governance.

### **Roles vs Users - Fundamental Differences:**

- **Users (Permanent Identities):** 👩‍💻
  - Represent specific people or applications
  - Have permanent credentials (Access Keys/Passwords)
  - **Example:** A developer accessing the AWS Console
  - **Risk:** Credentials can leak or be exposed 🚨
  - **Recommended use:** Only specific cases (legacy systems, emergency access)

- **Roles (Temporary Identities):** 🤖
  - Can be assumed by any authorized entity
  - Provide temporary credentials that expire automatically
  - **Example:** A Lambda function accessing S3 or DynamoDB 📦
  - **Main Benefit:** Eliminate hardcoded credentials in code 🔒
  - **Security:** Credentials rotate automatically (15min - 12h)

### **Why Roles are Superior:**

- **No permanent credentials** - Eliminate leakage risk
- **Automatic rotation** - Don't need manual management  
- **Granular auditing** - Tracking by session name and source identity
- **Scalability** - Can be assumed by multiple entities simultaneously

### **Practical Examples:**

#### **✅ CORRECT - Lambda with IAM Role:**
```python
import boto3

def lambda_handler(event, context):
    # SDK automatically uses temporary credentials from role
    s3 = boto3.client('s3')
    dynamodb = boto3.resource('dynamodb')
    
    # All operations use secure temporary credentials
    response = s3.list_buckets()
    table = dynamodb.Table('MyTable')
    
    return {'statusCode': 200, 'body': 'Success'}
```

**Here's what happens behind the scenes:**

<img src="data:image/webp;base64,UklGRrA1AABXRUJQVlA4IKQ1AAAwKAGdASppA1gCPrVaqE+nJSiiIbOY+RAWiWdu/DqZht96OU3tP/qvxj8aGWfKv7T+8ej5yf3Wx1v4vT52j5cHM3zJfNH/Ifrt/fPg/+lvYE/tPhAe6P+0f+D1Afyj+9/s7/9fi3/4Hqn/xH2V/IB/Y/9B64H/Z9h79yfYa8uH95vhg/rf/H/eD2xf//rL3kb+0fkx8AvAT8j/ev2r89fHT55/aP2k9ej/W7+nUvmb/JvtD+M/vX7s/3b5zfun+R/Mr+++ivys/yfUF/K/5f/lv7b5NP852q+sf7r9kvYC9ffof/J/vn5Y/CR8z/pfQz7E/6L+8/AB/Ov6N/t/t2+gP+H/0fGS9F9gP+c/2f/nf5X/NfuJ9N/9j/7v9b/qv3S9tH1T/7f9V8Bn81/tf/V/yHt1+xX96P/////hx/d8Pnmp3Ya1Jyd0Nak5O6GtScndDWpOTuhrUnJ3Q1qTk7oa1Jyd0Nak5O6GtScndDWpOTuhrUnJ3Q1qTk7oa1Jyds+KJqdou2GSWc0IdmnFYaOpOTuhrUnJ3Q1qTk7oa1Jyd0K7NrYektTtFuXyD+2z7uhrUnJ3Q1qTk7oa1Jyd0Nak5O6FdmzmH4fLQLRfU5RodAxT/PQ9GGy2aO8MMeandhrUnJ3Q1qTk7oa1Jyd0NakfHTAamhDe/OKnMaMR9AMXzyxcuLY1NZeF3ewjNmhXXjfUpbSNak5O6GtScndDWpOTuhrUnJ3Q0zC3BoUoEa59XcpJQpo+pHuqoDr/TFc+aBNaH7ngfe7SX+z3Q1qTk7oa1Jyd0Nak5O6GtScnbOWGUacEvTZFUxXTXJxWTpvBeeD4Btk1v5qCNjPu6GtScndDWpOTuhrUnJ3Q1qTk4yEzekLh14Fg2i5Btoa1Jyd0Nak5O6GtScndDWpOTtphWsxjXjvuWdftzP6OTmlV+0H3NuMEsruhrUnJ3Q1qTk7oa1Jyd0NZkmSgFs7ltaM5guXHPK6O5ojw7WNAW/mbHhedqwjjqY8PcUjIEm8rAIrn28Qu1imXR4D9PFIJIhzSSEqldHIRqRrXdDWpOTuhrUnJ3Q1qTk7oa1I/N6RdmrG1lJRBoLHRrLWvjIhah7JUpHz+gBPj1ov6tF3/zwRdwqsswJ+eejnAh8KCHV+L0zhZzfgs1Ze+BwKxw2w1qTk7oa1Jyd0Nak5O6GtScnGCCKSyKi2KssjGl5dUwxDALLT9pasH7ek96ZDTUIgWY792CpLYN0FEX0HTYwqO9iim2VoBYf12cVTcykAPVLK7oa1Jyd0Nak5O6GtScijBUQsZZ8M37DHS7FR1/gSHyTVLAQFa19dbnR9O6GtScndDWpOTuhrUnJ3Q1qTk4kITUis+6GtScndDWpOTuhrUnJ3Q1qTk7oazA4OXBvA7cIU1qhnemkT6vxOjWqoZmawNBM/FX4RYtJvuEYDg1lgJW5d0G2C7iuLyiYkGm1bT6XwvwKo92ybw0HYN7DbovU8vgmy0JoFs+Glld0Nak5O6GtScndDWpOTtp3rGRNAc7oDwWENHUnJ3Q1qTk7oa1Jyd0Nak5O6GtScnc6h0cg9vpFYaOpOTuhrUnJ3Q1qTk7oa1JyKX9WenNKr9zP6E4IQdr2tVGc2A1qTk7oa1Jyd0Nak5O6GtScndCuza1/bJ7LxCNmR/aFWzDxBUPVLK7oa1Jyd0Nak5O6GtScndDTllb6cUdHlFYNnhAkp+Tdm3trOMmViaWV3Q1qTk7oa1Jyd0Nak5O6GtSRIIg8IbuuWOtiJ7OwASz6yh9ceN3UL0rDR1Jyd0Nak5O6GtScndDWpOTtt0MWxFCQi0C4kyYL0idv5Mr1obrs/Qifn+WSTLKqFw/ThodqUmHu6GtScndDWpOTuhrUnJ3Q1qTkY9qRqvmMEPK7qI9OJfP/69/jZLewceQx2wEkofbrxgERTcXDR1Jyd0Nak5O6GtScndDWpORj09pTrw7TZkpCkYOgNtM/OGPQzImc3IptMnOieQMv9YRlbthqJJtlUHD06C64ZZzY0NBIF2GtScndDWpOTuhrUnJ3Q1qA8pGxw37T1t1CyO45kjiEFLRWnWrovYw0dScndDWpOTuhrUnJ3Q1qTcztDOkc85PRBoNuTrnoys1bVPNtxP+T1VwhkOsKdiFzvUDFweh0Kk5IUzc/LO5LEVQgee+KhR4lABI1502WV21JHy6zRyc0qv3M8laIPN0Nak5O6GtScnGQjdBnEJo40fHg4tsyPGxDoVZhf9usBX0JZdgw0QJeE3S+iB2jNZHexmLNf4l/AnK4nRYUsmXnpgoaHPhu30OOXfw1K//B/JYlta5rIkz6xtPeJqlh70szaEay5aAFB2MmhEB5QxDLoauandhrUnJ3Q1qTk7oa1I6BiYnM5ZPN+1U8h7QadppF8koW5giZRNVFa481B1o4BMmum7jUEggkacpCiBQiCu+6457akQOGMm1fiyCFdSGQb6GCTSawJs+Glld0Nak5O6GtScnbTVwM7OeIlEH5TxLaY4hPlGufLUyKJ5++vLjKeFil/EeD0IQcl0hGcj32MbITpf7x6dqXJDVKgHlDXr5tzJi7f0BSXwMoXt5H23Q1qTk7oa1Jyd0Nak5OICeNpdh/DI2OvU6FmpGtSeUhKp+/LycNCuIP5xUxEn5orsPCsoREfGZZygOUJhx82fT4WR+z+IM/xnuGulYaOpOTuhrUnJ3Q1qTk4uDfwOWWKuW+tLhQ5oNlVOujv2BsC/D49CT7hpZTHpbbrpDq4hhGLPY3MqpDLStovR5rIZxvQ1c1O7DWpOTuhrUnJ3Q1mA+VE4Asrpfaycw+jPVUHq5JcmcLakVXcMPwW0A3sdn44k0GKAFeGEvhMMB6pYe+KILV8k8IS974qFDgAwa6Vho6k5O6GtScndDWpOTtiSZwR5Ab/p83VsoyAXFVpvAD1Nt4Wf76gFV+5C4+GwOAguZDWpOTuhrUnJ3Q1qTk7oac5VGPQ1qTdEQjI8bLWnNm60JLAlthWUf1s0iZuu0iezBATN5lQtRPoumeFl3Z2cYS8HWR7uhrUnJ3Q1qTk7oa1Jyd0RhKJZXc6sm9yBSpW4dOIwktObDvNk1BC3KndhrUnJ3Q1qTk7oa1Jyd0Nak5O6GtScndDWpOTuhrUnJ3Q1qTk7oa1Jyd0Nak5O6GtScndDWpNwAAD+/x6RwArQAACExZcrLLccGuIPe7+ya1lhAPgYB6p/AlFXME8knAuIPXcGRqqThOAA0s8KZcYnHTW2nRtIvFyGtI7GfXQiPVc/07AHGDdPhgrU7AF0pYIbyUQyfphrizfenQq8UbvDLDaVKj3VqL7DYTmrdueQS2nP3xLM42FsJQKNWfs3Habd92Ya3M2IC0GG58vdmb5GhjSJV279o2xYw0xir/FI5mV0VQg48BxUlErrIK1lrsRray2ONUedwFjjIz4tBD+U/3kKCoqoyJAgBAERlq9Y2RlFk+6d4FGGKWIEhrOFV7yBNTyfNkdq5Jb+Aqonvv7Tq9rfhjeALcATcjftywpOp9xHrogdn7Ak2aEgJ+ZH1MCJnxKqUwLEfadCSrqrHKeOGn/R7gdTHTb1IPGosLhaVXVXaMJhr2ZA7K6ykqD+HeZ1bbsGPZ/Qln7VulEhX7BiNfNCJtxDO61Ea7giSqdl3SxavQKIw4GYmuT7z/wYHz3mdkb3yurwuPHHRxgN55/ujDOnGj28V2g2qicl8+Ph9eSDdvM5NmNhhfOHveY8V94GesbV3jdmc+MYAhsQ+0gFDpGQUHVkL9UJdeVEAT0YH6ik02KsVBJ99pQt6TcPwfqAREK55Uqm9TNRYcjKduNE7F9KBI/ttpqoFOwUFvMZamhHBUrDYf32UcvPQqbUZagh+lDR+V0JAgNzUx9iQDUddEMsBS96A9EH7MiXiJlzW6uAiq5z4uh83RqI+sTxaSaPdKf4OT8HKjc7vxtxCyOd2s+4CPU+DGQhmSDN1X0s+qZzjqlqikKwV4D1NTcFxjmU9Jdq62wnN59PvSNPg1CvXl+11UcNZpCwX8gy+eokaLlATy+hZ6MI+utUGkoM7c6A5tftllsbBk6Q3AwjzlWt4hmGqrrCWNVugPdRTFPb2lCxlXmfeOy2lXAssZjPAm+GqfNqd8o6VgsJDcAscm6GMim7Gk1sML5xw2d6BOzG1sLJeO2r3IQQA+aoVN9W3mhRF+Lm63dt69iIye7oYAHrWhCjOtWsLQ6g3D7p0Pv8hHLZZQp/qDXXuXEQkPFYYBO+tJ2f6wFRwFdRayMV4orPI7NyisdHxzKJlcjNHFqm7f/5PTOoSj2C7kvCFtzHxHWTBHxl8FpRCpqZ9JM+r3eQFIGWi+jVNdjRjJCJZsBP15myv5tkoQ9b026UCz4ntF1xhjEA8Z8IqEd4ZbaRAMUzBSedmAJxTEpN8Tk9JGzPjwATZqvpqb7TXiUwV7xkatBtsoU3vyMSBDH/O/S0eqShUeVsNoD8B5LgcrwOH5itJuAWngB1HcBvR9/ltcmR9pFJ4ykwl7uoGdJpP0I77O9/V9LOGIgmyJ4OZzxsTEPcUOu4Kh9w+KRxQ73funAtIGMsD1JpQpKgYZNgRdruHjtgzn2P7ZxD9LZm5CTPXEt4jkJNUBVEfkILgJIu5Wzp1ELOdE4dQApiEHkDJceOvXxgXnaxP9I1AgbHzRUKg9rZ0afKJ6xbG47MmCQa/5DHTaLiuCqsimIvR7Bf9S2vxNvWZMzGbRInOftC8755BZImbDPoWu/FS9y4a9ZH22DgCCdduWVUzaTWqBio8++9NGjcOd9CcyfqZfehjX7lckg+UWTjmsy8Z6ZzKY7ot8rHVcrZozij207nZ/BjLE2jQ0JR1yA0JeDKRaBGQLuB7WxiNdfwprFH4k0mLRDNZAsOSL7bB44ToNIosBCS5902vCr4sIPoYgrqJDw+bboXLyE8MXKi929KgEq9AQbPTnR3VpxErpp82LZbaPC8i87bOwS7VfSyBGgWtKg83S7rfD+esPa8NXul/P4XPeaJKwY3S/1JBh2l34e/KsiZujE5JPlWky0u81Xws5BQXxfYUXLiZKwpD2/uQKz9ON/ZgpSoye95khNnSoQQ55a74Rk1vymSgaSSZu1W+/HgR1cDptMqtP6uOk98up8Cjw1kaRsBquaE7ccuzODIhN1TK21CViGZ20vv7eeVp4tTRU5VXNZYxyhSdgWV8ik2dmrGzbDTQTdsvvm6FFSbsF+xQ/OyVfUz0mxaxgDMQLRiTUFfHTPkiPnwdny2HV72HzTGx24mCvVS3FwGkON5eJ8unoWBmpOuS19xHhIRjhoQu0c4hX1nFnXB56HqWj3mnS22DKqMNqFZaNdH3oys2L7iFLUqR5Nafp+DYCTR601wmWXejRsu72IbHxXr9JIzW4kiNdvvfY7gpIN85RwHcO2SpgiaVdDln18QR7KzB+nrXlzPr9tLe66/Ft5LCJ5Rv4vRAWlUjrYtoXkm5W3nBvcZ3ZeNbshQqZz/jks5PG2B3WxGkFlzLyZSxgZiE+yLWewFoaMG34DVh1ugEAAaNegKBbFQqFPPC0JX+/gT1BsLduhHnO+18agqe5HuvWF6uQT6C3aptG4iXMpDTHroQma7/9P/oDJ8DC+VUBhgPi0iSPkaepRNJ8SnumM9lblLJ/nSILQPk0haEbCbLlsVCzt7M34XROB+t56tWT8VtMVLrYc3aeb5ywQzySJ3GAt/nIoUb3JN7yyUN3ydzQJ1gmLo5u/D/jaxbEt9EAXFiihpEv6Q1HoK60OHzI5ihO6DJUheVDYQOIyUtnsViz+BqOwo5LdT5UIxrWd5QENJ4aLyoVzHdA4qL3FD0zsYGMx0n/7dkS787AQ7Og15ESFDqNrHzWI05+DejPmuxo8L7gSfsZkfiskVzbYgzb98OdMcKlWyRb86oj9GXqVdOI84pVncHWBlX0l6yFrqNRO7bZQye52XxV6IBfPz0tbWDXShRZJljMvLB9d5IBsotJDtJVX/txryCd4p5FmWyGwU9EsznIVYhp5cJbrEWXt9wIvdMfnfgNQ39XH5bnO4/dvkUXhmbfphhxVBo5qnWCXWz4OZEDWTODe7X0UQbqNJhvNwI6INLwJ26QMOzB0y+WfvlAu6D+REM4pQytI1q9PmZbzRzWahtMfks7h4Y61OUb00psiVQaAhDOoqJ/N+nBL0TOkQThr10ULQgsZyxQtPoj8mucBF07dSrCrLOljBfhMVRDaoNW0/vM8YDJ/lc1eOE/WsNE7h14e0oA3gt20PjbUsGANcpGz/YQd/E8EF5lBEIGqp1nCEk8/g0myTAhwU0AzpTBi4H1g5tff76dqI7bcdSlZWfDmzzgF2TfX6AGun6ADOjYYAqyEjqtfrOvMFoH+T79xEJPeUsGqbdUbaWMcQSH19oCIMuojlKqI/8CM5HcyvuQOF19iX+n/DzaANV45KUFgaguVTWm3gcLl3OueFky6+EZLFJddGfD8Lh4fptoU0sqUJuas9UIk/ND4+SGUwkcaRAAsQArRQnOi+rph7BQtzYQbtpZ7X+7Qum7KflUmsKE2y2cwd/dYYagJnAtuso8Nbv7tbkSgvfCrArP+x11jgoviegmmh3L+uWpgv7O18SoSv1uBiPUAUyXTZedJVPWveAV2PIihaU9L+vXTHCxZ4tiaxiXrsCf1ZMf94Sz5i9sicFpUIu5QVfTi5GLk+J+2Ifp6QaeD1eh8Xn1QzijNqdMTr51Re76PybLT/dbJuSI/nr02YR4ODoJ96uVH+K0zggsrKZgJ7UsEE93u4Oy6scNW+W3aQhzHF4q8Z5I9fOsaeID9PSM8RaPGQqHxgvoyeUM1EolVfMaGW3ydIBJrcQzut9nISV+UAUiqYRVT7eEDilZW4Z/shnTOADA86IuzEn1LZXZZn2PM/G9mjucLB0jbUXfO9jEMeiUIxTfcSpAGl2fh2af04CLhMUSQf/J+PZeZssqbPQjRmbQ7BMEWIRhMNzyddeRToDJPKJaznreWpGLb2wZqjUPc+aa88n7NlqxCRWSUQMAFbNKxcO9axFOVFiutp4aWjlF6eXk+lrFe4tDwqy3M51AQnzwfXD3Q1Oa/Nlz1V6gRjf7HUz0r15Imky+nsywNCEMGJ73cvvsC5VILd0wiBUiaU0dCy2lwOsQ6xH7u98GqRJzG4JR7M/r3nfsxwZ4Ar3Cy8xgkDjgGutpftfgQvH5AWdg9hj34ZS1oSMLETKcOj9By5iWMmI7dLHG+eGir8tjRYiMivZe5E7P9sAhgq5l3ihXfCqArhjQwuW40yj5TQQRtXVD67aAvttw+3G44ic6AeY87AFzTtoWZ1JViaHPg9b2CXqrlXTCgMyV9LmjkD/NWBg+a4EP/7VPCD/ZuOwhD5NvbxYtLSc4FXCkeJPXWgAAA/x/BaWpACdc6pWJJ1emstUBY/IOsXYJMn/YX/LrxiPpt7zVpE6h0OhY0n3EB6X3r3bafcuNIrkyHpWlCo339mqgPbeKh1S4ILeJX5dDLf52ZOdV+DnT3ZIKOStb+5qMKS2/15I9vS2O4E0+3FlriG0T65aRAmZUjhYAyfYuC6LQpy1wynuEYzgNw+CmQYzG4DR0T6gDuS0cE9aMXKW5LeF+oXoDjoJAQGVM+46dxjxGPk/xTGlg7ay3JOPxY3ut9R8Z5/25b+DExZA07gkTW+nbrd1r78qh3vDPccZ8fZbuiMVVMY1Kh8x4qAgSmXlP0Q6HkOs0QLGnqBLwq3hlX5azfjUI8JVXn+qhUCUZRny7XpPTnjzStLTgPrr8MsOTfhNW68VmMfzpQOn7gWvFbcLGQqmOnka4ZjSpqllR0CBgk09dYf9dUFDz1q1hhkB+3FJ2EtnPK2XwFPN6N/ZgSKFVVu4KE2L/Q2WWGf0k8IINDzdKnWPvi+jF3DpGWs2cRcxubfLXrfaJ1hTBcTIPlVY2PcFaPtpbVKOQ03TArcflrb10qebpNJ8OSU1fJEYgQNhPoHGjTEvij957Z8c4ycn42UQ15PE3tPltBelpy7sLlpkD0SqHxzGybzKmLos4PjLm4zT/D6a2E6LHrAaMm4aZYLt8cC9WvB0RxGIylHlXNFQHGLdP6xAwLTAkhEGeSnMg4ZTfATJkZJ2tFNfqv1g2uM8MOju92FMb6ZYyQAFThEtuXpW6jmNNm8ZdoidQYWb+I5VKF/Kgo4jmkJqkVK/29gli5YVRzYoa4x+5iHoFaUrQR0siPk1e2TnPh3pMJTnffDCVeLzCaz4zJWxISIM0bi36NJ1iX93xMKnUprsvj7EOCulWTa6K03A3lTtwzg70c3jvDpbL63xilif364pwsfhjsNUgu1vPxsq8AmZ6/4zcQE6MnodAZuDxs1NK8yod7ML6FmQUOV5fVvP7iulRZztymU8AHwl+jDPhcoUDGtn0i7sAZR4FkmSR57H0uk8hhqG5nmRW1GvgiFABmd58f7OCZV6sfYzCw8Rdpf8G5DbmeVGb/4WSkCZrv8jLjXmKmXUxGpUWyaOcFT1v9ldTl876ScPzHoOfq32yV9/CmGygqP4bYmp2FPNj63zRu2eyOoq5WqOl5OW5o3kz1Uf7wcycRgG2rjGXUtlykdo8JmBn/TX6trIclJdhUjmHUN9gNvcXhbDS2OIweq4VZsnO0fiVZccKGvl8FKt1CpAlvgv431oz4sacu2XEr2VEDJfi2rp7JQu0bTZBi/JCYw5DbbBOWgHsr7icaPA4ut0AFLUUg22udTMmOe86EJeHgvmoVwirougkAmKnn5d60SnLCqlG9LjRFer5G5yUbABGFODy+Y3DUyn3GN1KTsik2hseAZrH54ynR+h+RIrwiV/fR6dLwQAAAUIS5BxVBy5Dryf3XRqfjiRWD0eYt2J+RUVIGdDjgm27kSQ/5w6WRVVoRFYIurLPcizjRxdiAwrWRWh3tDU//qI1z6cB/3iNraQa/+6SYXncd182Q8AIBlZr5RnxfATUYdRqg8nhCw767M/DctQ4Bq1fNyMATyrgEFesw4gGJ0KFzbaHoulRIWBzzDeBwyL79qKAAA8qq4KYaNSBjxkLwH9g7hfYxU8Mr37/0Z5H7oYWtikyZ1Ky1y4i1E0U7ImZnw4qiX655kt+1o+Wrcc6wKYah2EqcO0/45zOaAmEj8QCqNBxd/yTIF/TLzokaG1yW8/L5pOUw8gRXBgngtOeKXWHT6Q5uMXU20PvpK3+tOuIuvbteW9ds+BbHcROZ1IAIMBt6IOlrW88h3GDPxPb4/EDioDWxqRaOLJKWAcFq1IC+4X37h8JHUOhrM9/QxSPlKCkV3E+yreereeqpVbmPQH9stiyJV81EaOD9ihaNsvz4H9PEIJLMICRE/y9rcurZGT+l0ZAT7X/wvRwfkvCWQ6vuzYGLnT8dRsH0kpF1bX7EclJXJ0gnOMj8QhBtwaWKhBPU6YRlUdHq6xdZToqAcMjZJeiCGKfCDXrpAD0vYulgJFzNHkhYPJX89gAGp5wHFQedHgcn6/TeBkoyFWHLf7wpu/TkA9oUbCrz2DZ8+Ui2YwTaUr/5nmJOrikX3ppmWJopzuEtDdGnAt4ibvmN9l1pOZ1V1WQER8EwuvV35jKd5ZG18th4IIkfF9PA/RsLkfOYThVqmZmmRBh2W2K4jW2CF/NS4vIGC1yR/Hdefv6Fk2+kREfdwU5tg6K5rzfzlPwwlqogLGchC61K3I7C+oCK1yS1ZoYWKrVxxbw5CC2H/JVq+ZMhyNt1vLhM1nwH9+/M5rJtCNLsAZmQE9kBvPQXukCAccjwk8rg/HxCxgjR2jFk8XW6zdMQ18PWLtCsrtc+Tl8qChzYvLSwmEO2YSh9ZhxN5bJmsNwgRc6pdvkjfCjRfrONHQxAyRmG+w0wjY9DkjZsdYCDkizsu0R/PF9q8TCG4m17BgxepjHRMEKnd6PI8BqcsUJdP+ZimEYgpCrMrpjURPAHK/Zac5ictQtuiHc5h1v/TQRAGaF1/HF5wMzRzNxN4lYhkyhLHVZiYqbxYHJ0UUSjFThIXSa6sfXh5qHkcudDWi4Jkf4PW7K67UaRE7sp5x+GXEjUFcC/M+EhF9TZWWftGN2VAIBihhTK3GzdYyxoakBuqbgKEahibI8iCJ5+cP64+8TMYg6J4usrglIv+NHHsW0mlFge0dDJnPTgQnSttrsA9zu+RFCGGkrAX3TiKSNQCJVrAFKOJGS2ncBSkrRbdThvR+1yJGa6gnyK9FvbZ6O+ZYMUxJYCwaTRr1glgQ+R9lH7FOAnqCy12dczqNFZriPBNN1wgg9gU6ZiWrj876nVTcJR+iTmARGppGMesPa4C4+7Z9U7C29b1VhbNfUfLm4jgLjFyNdS8J2CxKFDiuLifRzWY59ID9A3v6RhJUXJoBK8gA7BuxvLTYuzdsPVsejfPo7sEVUkF4KJbsaelA91y6dRh8u6NPBg/oMhONLKNtpQ1oOLb0jHnNyppAJFBP6rUj8FS+kqXaS0TsAVu7VV03WXNs2hFtLQzZ7mWGa9jLFoF53oOrvPpwpuhLgJPI+Oto9jtnwcsXY7Cr0NPaVb8mRMsbky/WbPVJYkIOxysCKEV+rV29/awWoEd7Tln+k1siy4E13z0XXb5LYB7eeTRkWbiF4ot2h/46RvfgJJGZGuY/JeT1DZeHLJoqRFDcTBIeIW99WLhV3vmWfge/3T8l2n9kzzTG6IzwtXW3NQwPgouKisgZMI2fbap/DsFL9rUUTHfkrQBevOmN3ozqpHgu9xJ5+LwKU4fbAdOEKVkTpF4YS1lRDaqVRnpgRdt6xYwR7eGAnCEdqbY/NtZOY08fu5hpRn10Fp1LUWOZ9QuJ0KwwmccLuOYQua3Lvb1sEvsb4SWRYiu67hbbQJQCeXUCdSH6KWu2etDqn28qIpr3ftcXFAxDO1xgz9jwb3BvC80bJc+klpWZvRaZ3L1jcbx6U+o9s5kNTCMy36/DXOFf6n51VVGxmdH4IbaJ+w/hCT9VLRdmfkkKD+Dd3vxhP0xXp/cbrQ2GRXj7j/8QiQWgrrSg+mZ/Y2br3lgG6EcL+PWgmOKJsNjR3qbSqrzzG2gVdE7MtAJvHE3BuAUsAjpwAusRjIgSATlcv9MfJpwgBn8IzDTH1APaGuzV6qN33FetTygGKq+hAKAGG0FoSfEofzV1M/aHoGG/QdfB9oKtP+FabN9DXuEjAVMQ8lmoVJJfcoFbCCvE8tOYO8VXFuYC2JNrMNr7DqBE0hrIs4JeBG3cXtvLvOHjl31vn7InMmkCTSX4XKOAsnyvM8R7QDzC3s0BI4b2az4r/5tHpNH4WAEHz84q+Chpp+igdDq+QoBltqmKpYfzr7teMUm0a7LM8825Z7gyiADAN3SeQ95deEzmvAUwnuMDtAaWzJtYklPiQm/Mc680AyB80AVStLlDL3iyb77sQ2XnLl362oi8sFldjN7uPI1OPg08qAZ919NPiDIgE+qCXf/VAiS/Oc7xXsZCNZdqNh1tREh/KNppt4JemlHfXFYh8Xh77uK+1R1TEO6pvy6FaABJV3XhZ7oPufoPqjM3sOpE1nGH2UKpHLyR2eh0eZdkb2Sk/+HVd0oCrimHCSImSu4IeG3ekcvd+8yxiEBeuL9a5ersovqCVLE25qS3s1HYAkmBQuuphQYHrLrZsaV1tM/X/ot/PleKbDCTckdU7mOCxePbH1gzUUIim7OBg+wsyO0kgVgauc4XF5Ldz6GERzn+y+VM+dRSleeeHB6uA68hfwfgTvpc1roPCA7QrGFHOFJUCgUYTQvcTcJUMkyu1kNFXJ1qWa7erffDj5T/z6kL5J1HCgGOA7JXajGSMsD21RobWDwVuPGt2yeGH4rxxMhZTyaN/sZLHnlBcW84c6wT3n9eHjuyMYlkquSDfuWmbMPrFYBUothaX7HHK0kA0jOMcLioY2S0kR1fGFxryhCjFk/iLaB/QzRKPz9c3MtndrMlH0hd3Q0x9dwpe8Umbi+c8pxVHJ2nKRhdw5QvILnemt3MqGkM+HzTy4O/DQZ2tNy6O4BqeRE39BdRpj4Jo/dMTupWB2PXnlYzDRDaAZeo3fAXzdX1lCwyOUwOnj0V981XfQoMqi/ZXeflC0PH460nTQfn1n0iRYoLRkTkeRbQYICL+67g4JXBkKsqW5ZiNRnWiIOAA8V6qQy2dhFEfvFrOtvOqJ44OE6/X04qdFbtuSPU3FIJ1yPt9GeHuGfWVTT0KWJKa4tqqUDt9v4BZJynjIdGDV4yKyMsEf+PT8iyN3KPg6UcUnjoBgIJdMv4sotzO5H0tNes/Nfkyu9vchnCloPHcxl7GSP8ZwT/rqLm/X7BLv9fO0eO8QD1Y+OQy7BTOIxhMVEY+UZpLFgC157u4GcIfjFtxzunjuwmeAy45wOsfscUjQcs3smJz8bBFkqupMN99Zk7TzbHwjzT45WR4EbtkruY8auRugSoCBBZHe1sC7YwqhA6glPE9U66ikxkxwlPc5TJOrY4ob187FhIU1bsy0RbzDro15LeL+c/d98fXhkgDNxQbHOtC69CtqpSaEJ0w6hITyiTLxNgHAq0CCDPb4NID+sU2GLkqCGqx9SQPn+oQmNGyxwgBqlXX4E5vxGnS3bHiK1V/Twhw4weo7gRFJy/OOHs6Hn5mL5Id6uQUzNfK/d0bR4WS9HBZ6pfXYNzmSNVgxa7StyiqqEniA+19DxE7gMsZ3hHPGw19d59FvW8TyOrBxQp+WaLKU5OLxNC2xWtkmyrLrcUQAzb8dTfwRa3NtYwDh+njorIYNmxlCeyY3Ph9lUcqzzxC+bYQb8WYZ5FgoalDddq6Pyk98746A9149Ogt6igiJ10m46xUN6PURZlW1C6/4/SbAuV9VmtqviIT/fUtr6zgX50cawouL0M+dGATFlWQpELKwFxhHJ/w+cH/SpQq2sccnRda5zX2vr1YHyekfrav7vrT2Y9W0GigAqy1kfdZkhx7oaHV7hiDObOP72NO/ubKaew9CAdfJcr959DxO5/gL7GMdKXtcTrCbL5JzHmz8Q6KLyO4zskg7oQ5YLm+2Nskm9SuQReNkr74ai2XBFFo/u0EhUXXVzHxbw0BFdDXBuGiNMAsaT4xrqzty+AOJa98UU1utj2v04jf3BLHf3desYh+xte9sbZJN6lcBI49YQ/DOi0esv/xuq5dCEoVkVXbzj5JrwVhNqUU9mUaBRFFe5bsQpJ4DECiLGy6Up3oJsJ2gpCHkuEexA3/CVDwmfTL+8wRys4uINXVxp2GR53YPhAB80Ac5xTFxCAjo6/WLA02WGReygqxS1kt3d+NdoM5rMmtb2bTYht+xwpS/NNt6ejW2G6uai97Z4CAFBrB9YamA2UxYFcfyYbESW8M0T9yfgum8q4sF+nWtu58cgZtp2RLNu74TgVTQS68/jH0zYOdrFTyeem9qpd9Bojx8AcGscgYGr4RfAS5deUK63zr7qYnfCw0mbVQ7crP8f/Wd18Dd/fnFttBPjB6z9BELDlvNgDeFgQeXRXrytiJysVIszOM6b724CCj3Y99Vs6NEn8azX0cmW3P531zYcP5umNsLY22RbQlYY+9UIOLEFtUAV2daupNIRfd3Tw7kSBHUynH3rqhWxuZnELhmS2KGuZpdFQ1cyK2nDv4JIr5KzYgCGiUVSTtBx2XvxlZOEnz46sKZcGe3RoCRtmwPI5F2KimLI3X4modwad/l04NtNvBPCZQuotFvsrxoOmC7PbQgHiyiFotI0/GLW40uEE5spe7TkmbRTypO+asqa1UuFcwZyBMlZx0b1kGkF1e1diZ/OXoJ7cZt2rIj43cg7VEopcZ29gxC/Z+oYItpfuFBZlIn3ulJZP0+L4O4mqeSPF2CqgctN0BFfX9DyfaKFIErPx6+tk74z4bJTJAvB3+58mDo69iFCcOTjfZpkY/sLXQXYKENMcsI/+s/KdVyUPe47VK6KtZJ9LyH8ocb7jpk0gpdz5cc1GGxQ1NeOoDixjwXdF2CuFWJL6jEQfvK/aGCJcc0n00BKEGnTt3b2czroXv4nu/pH0dWljq+FREiAr88yVjvbBuO8g5KWoEO2lM4g3hXmwuWmmtQeMr4Kg2dCNk65mzaIckRymxOFuee20jz0Hk7pLHQ4Ad15VVoDFfd0Yl1cId8QaVUhzif14HADP7VOUqZc5dYp6KZWLVxEIuSxtPHUVZWLTuutqMRWxBThg1AOA3pfHE0/MI8HJ8BQubuOyRX3e5XrHBS9AWHswQoqiGNwoVZwvdQF8VGnNKJYoveW08nbLxoHjzPk7Cept+pkW2ZVH/Coak4xxReyJ/Odl9thZ00x7Ax0VOqeaK4Cs3PWmIcto5z9M0wTaCO2cGJQgaVHO8PK8XiSojilbEvYtcTbxxmvB5qVpDAMMw6Fr0U1IhJrXs1aADWOW5e4dxy/YQ6E6Dq+sKNis6LKosZvk3hrn+dCK4MtpBxSScxgpdYVRsqUzhKCFY+2FMAXiP5VO4BAUVfoXISaDRHqmqxs7ElVXeK1ZlmIWA/8+xhcRBTSHq8xQIr0DCh6/1FyPLlTsO+/lSf7WksuIH22rT6VZkCHHMGb3DY18I6pSefOhmZ/liIDfmakNJboDb7rkDNGi6N98mpqGTLI9hc6Ou6yrnNhmSaAySMMRD/Idg7m/Vpt+phCNX52iLGIfO2b/7DpVRN3Tf+LZc0x+0bQH+tpOphKOLVu9nfXVXJUdsH1lZIwjpbMQ1g1V/g7n0USWzXcTejIzTrTj4+l+MZT/5eQS/Ny06WpOURvZiWpdzQZG89s+JxW57/Wk68kw55ZBuEcX+okj4IDR1gs7iRe7ee65MSrvvh5gHgYJzhlbXzys4WXkBO+aoIFZLkOSNszLhRGkpDEGk/nS7RjJ9EEowEebsNKqCn1ya8tL4zF4kCablcmBNSJnmz5R08FB7NR/i+Y56OvAg0OE1wIXRN7NIadAbdzQjDjwsNgPd/FbcgLxg1vlMiY4+kcV6qfjXViPfZGQ8k9JtbX/9m5CDu2PtYtsCE9E/J0//O8hcmuEaK1rePFcjyrQZyWyhlAv+KvQpkC4Zi4T3UukQWNpeoR8eeEEl1rLvt9Cdmg/TjJxMULRZ7cp+DZ3TLRkjOSsogjnJ9GVrxY6uWTxtrspdCZAJNeGBWbn4J/q+a4Ldf83nS5JPuRtRDeZIg0Abi8MGNDekEnO5TIpiXAdENk6x5LUNjC+GJ6lu/d4cjl2N/8l2YBlKpwqtsyhxccePr7FMoKuxhqKQ1+nxCbckayUHnAOsj7sl1PMGJALeUYMobIQ4qM6s86djEGwDSTqUYC3j+s0ufk7LDwZcx6wNwsRcmveYGj7cdmODFdToh1Z1RNE7CrWygVPuI28+K4K2X7lXdrteB6zov42Y89TGhH6gNzi+ILaTeAZKHkwZwYh8QxxTdbL+vA/GL2PDAekC8RFnTgtQe5+EAVTsQ5t1jntL7lYgqYl7rmKjDSpMZgVeV/7ryzt1y0OP4DPdTufmjZ8zYnS8e/okiX2xr+ynP1mbcs8+GaUwa1/2BD5BKhvFprrfwF0WSRz9HPlwB3PXIhWmjSN0cqnnOuEJeFS82uWAcP16oIYaHvN2+nykh6b6BnO8EywA+6xtQcgxeGzAfx2KYxwRnD1rgPjNSvduLMInkOAVGeBoFwkBAarSsYUbEIuVREN6sUBVzT9bUXb6y23IXOzUUs+R2lXVZ5pePuEMMij/M0nmkPictLmj2hPzneLGuk3/pZWffnFEuskr8O8OUuW6e0JwjmPgmCWNneUj/5eB+00Txqb2DakUK7F9VSFQHu5sFpsBwBbhXY2yYXGvkWCtndx5jEAUoXXVxq8ALFE3Brcue2E/ZiOFNVpdMQygFMp5Xg8LzRxjUxxRMlV5LOxPnrxnnER6i+sOUo17B+BAfZ3Y+RbVFMkhGvIZkrUwcKa0cTokR28GYDXMhLeaVMUxYeA/ZelDi08ySpQJay3A22kdtWFexullHNqoeXmabrn4tvjHrx3IsoHIHW5Nvvye2C6KDXPu/akSn4i4MsEgxVMubuDGsOLMnrP97Gskuv0FaQVeItbJgaN8LaOioZpeXKTY13mzO8TCY+aymB89g3tDjvDBChX8nH6TQz0wnTNTmjXFFalNdjikrcy61L6wYgn+2K5rFLLEm4FGTABGlUBB9ukC+s/vYQGk1ngTwkGXX4GH/xhJu+BxOLWIeAiVSy14BYgv/5mIHHlIu8gpXDTwI1D4PIiBB218QZPkIuNPISjlyM+8jLO7sc8jnNDuYItrqWH3UCvZKCGsoZUN2hcW2yubebaCDj/E3jXupgShfTYlm1hdicry35wKRP+m1c8jZBJF+V4hkqrBx9F8YeiJBPhVOtRyFm3hsXkHD6L05BpDz1VqbkZcDaD/IeHZs05cCjRVbwmmOI9lMr2Xl3O2TO+8vI7Y40xHHLDrp27/TIkBtXZmJYSXhrWfbMktIVWbnnsMDMmZkJ8PbBDqSo7TkZ1UxDSuEz3ufmdvXFXm3U3nJ1zKv4NkNKL8Py+ce1Fqic2S7gw2sOEvb0039N0dkUZqQHvwOlx9/rImcSZxrQTXzWUNRrTR/XQFV4XTHNRhIfDDbX+AoTxH2Ucc34LOqQXTV+uCwon5etAONghXHwmSPcanxICo7dMbY03MG7R0be2kefwvR0NajSrLdVHDu/tRIvvfvNdNnml+K9RcplIuGTxQ9Ecl4a2GUr8iafJCEhlf6DnLOzf2pO6hxB3L1g+GBfqB6xmdjgOF/m+HsNh7NE24Mz8n7OBDICVnIbepT8gP+5WKiDUFIkaP8f0ISq8qfm0e0mFYAKUKIyOi1rZqbeEqyBpmOsxCY73kztrvZhgRFX0SRBZkOBp+xFW/r0Qn8S3Eltwq6yqlaAwM/i02NLK752SbIo4uLmCceQFNPU+eYTAhAvlgsB+l4w7cJXTYedaU9qqWbzhZysELQcs7lt06NNfHLzntSR5B923O8xf+CIAmdSifk1AytnR853UlvT17fN0eB3vT3GXx782Log1CR0Qbj4ljCwcEgKowxZNrp6PDKytFlE0Lilc4JSiZCAjCQ8pcbnXgcTUDNsWmAFF65+zg779DPIshahFrU/OnAmPzT446G/NwuKl1s7ImVAlajYhqz1LhtofUdJdiAOwCLfBikFvQ3UcbmRWupgTr0YPLErfBggP4F9ly4/cbL6mNtddY8pVBhR6NX799JnC5aT3xbBpvpyMCdE4vhq/Qk62RMvOIQe+P7fODdtAoZgxHgDVn4zWQ+b+yfLUpEkH8agKSamlBgQhn9Zc2SZ4HJabNH2ofjLNal8kRiIHmMnjfaCTRxlB+6SwSk56NUdciHFRuEr1yMyLjYPDM6F3SfaG+f9QRz+3/JnE67z2TOfeFH98q55FvKk+3KBJiuAgz09OYanJjgM+EhMd2lvM2rVqXaKYdLYgK2GLuiZNcXCQDaUrr8Sw7zogWZl260y6P/pCXj6IaBkKabwGlF9pw15y2RKP0TdyeebBP/GwBt5Eo/G+CagACGckPE14VPPSGEWO6BgviuAKvq2IP87vWdQHy0HA/kW7DDUvefuZX5sZppwLO6U1x2qDHPbw6jcW8MF6yaTPl0wQueXf0TyRKeYbTyDL1q1jy7NJ/oKa77q8Ybcf7VhPpcqJbXiz0NUJT11SV1eaFI7w88Y8sTNUi5G0VhTAPT5LxZKWGNDYcFNvHacp2ucSagMFnHhtIVPrs16EJsjM80nTz0GpzYEIKPzFLeXPgWzjNtpjEDlREsRl19iKwGJOzVZcVgTQ9dkTEmOT5IDEjuuayuACYP77hyyBjou3WU0smT+2lKrwSxQeg3Bs4nYAoZhp2QlxKs2SJzDnaQghg0e00b8nMKiC73AbicCoueLt9yPb4+8blcjQLVUjXppxC6hJVetKiN10rPzoRQJZk+gYJSbjt4UfA2SkrZLFpbUyzU/iVfVwWWi9Ly4WS4H1POFH1sDs7bAk0fixFpsHBRn6hS8anphoL6nqZfJCP0FTYTNM9rLuu2Y5kGstQIqjcR2qtiVdXahnvQTEaKmQtUa2yawuwGAwWl92Bz4AcE5xx13v9pSs+y88NV8cOtau1JhZDEm/9WeQp0oxmPxife37oLJdwE3o2K2XO779CMqVpeo3rKVLreXgRbxJXMYvvjNiA4FLvbZDSSNa20VPxAIqlTMQFg9aACFK2MZCMgGvP4NnzO4mIqDIZq+gnfy/Yy9IfJIUdVX5y7lKiN+Qgf3UHbhF+KT8ZbWUM/fhxxq6BCEd3IlThRXhMqdtJY+35CdpEFjGTk4aCgc/TrKGy7/2RoT34YAB/fH/WAAAAAA" />

*The Lambda function automatically gets temporary credentials from IAM and uses them to securely connect to AWS services like RDS - no hardcoded secrets needed!*

#### **❌ INCORRECT - Hardcoded credentials:**
```python
import boto3
import os

def bad_example():
    # PROBLEMS: exposed credentials, no automatic rotation
    s3 = boto3.client('s3',
        aws_access_key_id=os.environ['AWS_ACCESS_KEY_ID'],
        aws_secret_access_key=os.environ['AWS_SECRET_ACCESS_KEY']
    )
    return s3.list_buckets()
```

#### **🛡️ IAM Policy with Least Privilege:**
```json
{
  "Version": "2012-10-17",
  "Statement": [
    {
      "Effect": "Allow",
      "Action": [
        "s3:GetObject",
        "s3:PutObject"
      ],
      "Resource": "arn:aws:s3:::my-specific-bucket/*",
      "Condition": {
        "StringEquals": {
          "s3:x-amz-server-side-encryption": "aws:kms"
        }
      }
    }
  ]
}
```

#### **🔐 Trust Policy for Role:**
```json
{
  "Version": "2012-10-17",
  "Statement": [{
    "Effect": "Allow",
    "Principal": {"Service": "lambda.amazonaws.com"},
    "Action": "sts:AssumeRole",
    "Condition": {
      "StringEquals": {
        "aws:RequestedRegion": "us-east-1"
      }
    }
  }]
}
```

### **When to Use Each Approach:**

#### **🎯 Use IAM Roles for:**
- **AWS Services** (Lambda, EC2, ECS, EKS) ✅
- **Cross-account access** between AWS accounts ✅
- **Modern applications** on AWS ✅
- **CI/CD pipelines** with OIDC ✅
- **Third parties** with ExternalId ✅

#### **⚠️ Use IAM Users ONLY for:**
- **Legacy workloads** that don't support temporary credentials
- **Old tools** that require fixed access keys
- **Emergency access** when main IdP is unavailable
- **SSH to CodeCommit** (requires SSH key management)

**⚡ Golden Rule:** Use IAM Identity Center for people, IAM Roles for workloads, IAM Users only for documented cases.

### **🔒 Critical Security:**

#### **For IAM Users (when unavoidable):**
- **Mandatory MFA** - no exceptions
- **Regular rotation** of access keys (maximum 90 days)
- **Active monitoring** of usage

### **🚨 Expensive Common Mistakes:**

1. **Credentials committed to Git** - Use git-secrets to prevent
2. **Overly broad policies** - Always implement least privilege
3. **Old access keys** - Monitor and rotate regularly
4. **No monitoring** - Configure CloudTrail and alerts

### **📈 Common Misconceptions Clarified:**

#### **Misconception: "Groups can be principals"**
**Common Error:** Trying to use Groups as principals in resource-based policies.  
**Reality:** Groups are only organizational mechanisms - cannot be specified as principals in trust policies or resource-based policies.  
**Solution:** Use specific Users or Roles as principals.

#### **Misconception: "Roles are more complex than Users"**
**Perception:** Roles seem more complex due to two policies (trust + permission).  
**Reality:** This separation offers greater flexibility and security.  
**Benefit:** You can control "who can assume" and "what can be done" independently, enabling more sophisticated architectures.

#### **Misconception: "IAM allows access by default"**
**Fundamental Error:** Assuming IAM grants access by default.  
**Reality:** IAM works with **"deny by default"** - if there's no explicit policy allowing an action, it's denied.  
**Implication:** You must always create policies that explicitly allow necessary actions.

#### **Misconception: "You can only assume one role at a time"**
**Common Belief:** Users/services are limited to one active role session.  
**Reality:** You can assume multiple roles simultaneously - each AssumeRole call creates an independent session with its own temporary credentials.  
**Use Case:** Cross-account operations, different permission levels, service-to-service communication.

---

### **Duration:** 10 minutes ⏱️

### **🎯 Session Objectives:**

By the end of this session, you should:
- Understand when to use Roles vs Users 
- Implement least privilege with precision
- Configure mandatory MFA for Users
- Audit and monitor IAM configurations
- Apply best practices in CDK

---

### **References:**

- [AWS IAM Best Practices](https://docs.aws.amazon.com/IAM/latest/UserGuide/best-practices.html)
- [AWS CDK IAM Documentation](https://docs.aws.amazon.com/cdk/api/latest/docs/aws-iam-readme.html)
- [IAM Access Analyzer](https://docs.aws.amazon.com/IAM/latest/UserGuide/what-is-access-analyzer.html)
- [Capital One Case Study](https://krebsonsecurity.com/2019/08/what-we-can-learn-from-the-capital-one-hack/)

---

[🔙 Introduction to CDK 🚀](./01-introduction.md) | [🏠 Index](../README.md) | [🔜 CDK Constructs 🏗️](./03-cdk-constructs.md)