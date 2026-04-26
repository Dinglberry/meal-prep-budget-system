import base64, urllib.request
# fetch the correct file from glow-kitchen-fixed folder on GitHub
url = "https://raw.githubusercontent.com/Dinglberry/meal-prep-budget-system/main/glow-kitchen-fixed/src/App.tsx"
data = urllib.request.urlopen(url).read()
open("/workspaces/meal-prep-budget-system/src/App.tsx", "wb").write(data)
print("Lines:", data.decode().count("\n"))
