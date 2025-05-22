export default (sequelize, DataTypes) => {
  const role = sequelize.define('role', {
    name: {
      type: DataTypes.STRING,
      allowNull: false,
      unique: true
    },
    description: {
      type: DataTypes.TEXT,
      allowNull: true
    }
  },{
    timestamps: true,
  });

  role.associate = models => {
    role.belongsToMany(models.user, { through: models.userRole });
  };

  return role;
};
